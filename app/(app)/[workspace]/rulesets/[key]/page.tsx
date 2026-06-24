"use client";

import { useState, useEffect, useCallback, useRef, useMemo, CSSProperties } from "react";
import { useParams } from "next/navigation";
import type { DSL, ApiDSL, SchemaField, Draft } from "@/lib/types";
import { apiToDsl, dslToApi } from "@/lib/types";
import * as api from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/contexts/AuthContext";
import PageHeader from "@/components/layout/PageHeader";
import VersionsPanel from "@/components/editors/VersionsPanel";
import RuleTableEditor from "@/components/editors/RuleTableEditor";
import Canvas, { type SimulationNodeState } from "@/components/editors/Canvas";
import FieldsEditor from "@/components/editors/FieldsEditor";
import SimulatorPanel from "@/components/editors/SimulatorPanel";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import DslEditor from "@/components/editors/DslEditor";

const emptyDsl: DSL = {
  dsl_version: "v1",
  schema: {},
  entry: "",
  nodes: [],
  edges: [],
};

interface EditorTab {
  id: string;
  label: string;
  type: "versions" | "fields" | "canvas" | "table" | "dsl";
  nodeId?: string;
}

const VERSIONS_TAB: EditorTab = { id: "__versions__", label: "Versions", type: "versions" };
const FIELDS_TAB: EditorTab = { id: "__fields__", label: "Schema", type: "fields" };
const CANVAS_TAB: EditorTab = { id: "__canvas__", label: "Canvas", type: "canvas" };
const DSL_TAB: EditorTab = { id: "__dsl__", label: "DSL", type: "dsl" };

export default function RulesetEditorPage() {
  const params = useParams();
  const workspace = params.workspace as string;
  const key = params.key as string;
  const { toast } = useToast();
  const { hasRole } = useAuth();

  const [dsl, setDsl] = useState<DSL>(emptyDsl);
  const [savedDsl, setSavedDsl] = useState<DSL>(emptyDsl);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const publishTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [publishDiffLatestDsl, setPublishDiffLatestDsl] = useState<string | null>(null);

  const [tabs, setTabs] = useState<EditorTab[]>([VERSIONS_TAB, FIELDS_TAB, CANVAS_TAB, DSL_TAB]);
  const [activeTabId, setActiveTabId] = useState(CANVAS_TAB.id);
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [simulationStates, setSimulationStates] = useState<Record<string, SimulationNodeState> | undefined>(undefined);
  const [simulationOutput, setSimulationOutput] = useState<Record<string, unknown> | null>(null);
  const animationTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const canEdit = hasRole(workspace, 3);
  const dirty = JSON.stringify(dsl) !== JSON.stringify(savedDsl);

  useEffect(() => {
    api
      .getDraft(workspace, key)
      .then((draft) => {
        // API returns when/then format; convert to UI table format
        const uiDsl = apiToDsl(draft.dsl as unknown as ApiDSL);
        setDsl(uiDsl);
        setSavedDsl(uiDsl);
      })
      .catch((err) => {
        if (err.code === "NOT_FOUND" || err.code === "HTTP_404") {
          setDsl(emptyDsl);
          setSavedDsl(emptyDsl);
        } else {
          toast("Error loading draft", err.message, "error");
        }
      })
      .finally(() => setLoading(false));
  }, [workspace, key, toast]);

  const handleOpenTable = useCallback(
    (nodeId: string) => {
      const existing = tabs.find((t) => t.nodeId === nodeId);
      if (existing) {
        setActiveTabId(existing.id);
        return;
      }
      const node = dsl.nodes.find((n) => n.id === nodeId);
      const label = node?.name || "Untitled";
      const newTab: EditorTab = {
        id: `table_${nodeId}`,
        label,
        type: "table",
        nodeId,
      };
      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(newTab.id);
    },
    [tabs, dsl.nodes]
  );

  const handleCloseTab = useCallback(
    (tabId: string) => {
      if (tabId === VERSIONS_TAB.id || tabId === FIELDS_TAB.id || tabId === CANVAS_TAB.id || tabId === DSL_TAB.id) return;
      setTabs((prev) => prev.filter((t) => t.id !== tabId));
      if (activeTabId === tabId) {
        setActiveTabId(CANVAS_TAB.id);
      }
    },
    [activeTabId]
  );

  const handleSchemaChange = useCallback(
    (schema: Record<string, SchemaField>) => {
      setDsl((prev) => ({ ...prev, schema }));
    },
    []
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.saveDraft(workspace, key, dsl);
      setSavedDsl(dsl);
      toast("Draft saved", undefined, "success");
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast("Error saving", e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setDsl(savedDsl);
  };

  const handleRollback = useCallback((draft: Draft, version: number) => {
    const uiDsl = apiToDsl(draft.dsl as unknown as ApiDSL);
    setDsl(uiDsl);
    setSavedDsl(uiDsl);
    toast(`Rolled back to v${version} — review and publish when ready`, undefined, "success");
  }, [toast]);

  const handlePublish = async () => {
    try {
      const latest = await api.getVersion(workspace, key, "latest");
      setPublishDiffLatestDsl(JSON.stringify(latest.dsl, null, 2));
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === "NOT_FOUND" || e.code === "HTTP_404") {
        await doPublish();
      }
    }
  };

  const doPublish = async () => {
    setPublishing(true);
    try {
      if (dirty) {
        await api.saveDraft(workspace, key, dsl);
        setSavedDsl(dsl);
      }
      const v = await api.publishRuleset(workspace, key);
      setPublishSuccess(true);
      toast(`Published as v${v.version}`, undefined, "success");
      if (publishTimer.current) clearTimeout(publishTimer.current);
      publishTimer.current = setTimeout(() => setPublishSuccess(false), 2000);
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e.code === "NO_CHANGES") {
        toast("Already up to date", undefined, "info");
      } else {
        toast("Publish failed", e.message, "error");
      }
    } finally {
      setPublishing(false);
    }
  };

  const handleSimulated = useCallback(
    (result: { trace: { rule_id: string; matched: boolean }[]; output: Record<string, unknown> } | null) => {
      // Clear any in-progress animation timers
      animationTimersRef.current.forEach(clearTimeout);
      animationTimersRef.current = [];

      if (!result) {
        setSimulationStates(undefined);
        setSimulationOutput(null);
        return;
      }

      const { trace, output } = result;
      const STEP_MS = 500;

      // Step 0: input active
      setSimulationStates({ "__input__": { phase: "active" } });
      setSimulationOutput(null);

      // Step 1: input done, first rule active
      const steps: (() => void)[] = [];

      const allNodeIds = trace.map((t) => t.rule_id);

      for (let i = 0; i < trace.length; i++) {
        const stepIndex = i;
        steps.push(() => {
          const states: Record<string, SimulationNodeState> = {
            "__input__": { phase: "done" },
          };
          for (let j = 0; j < stepIndex; j++) {
            const t = trace[j];
            states[t.rule_id] = { phase: t.matched ? "done-matched" : "done-unmatched" };
          }
          // Dim nodes not yet evaluated
          for (let j = stepIndex + 1; j < trace.length; j++) {
            states[allNodeIds[j]] = { phase: "unmatched" };
          }
          states[trace[stepIndex].rule_id] = { phase: "active" };
          setSimulationStates(states);
        });

        // After active: show matched/unmatched result
        steps.push(() => {
          const states: Record<string, SimulationNodeState> = {
            "__input__": { phase: "done" },
          };
          for (let j = 0; j <= stepIndex; j++) {
            const t = trace[j];
            states[t.rule_id] = { phase: t.matched ? (j < stepIndex ? "done-matched" : "matched") : (j < stepIndex ? "done-unmatched" : "unmatched") };
          }
          for (let j = stepIndex + 1; j < trace.length; j++) {
            states[allNodeIds[j]] = { phase: "unmatched" };
          }
          setSimulationStates(states);
        });
      }

      // Final step: output active
      steps.push(() => {
        const states: Record<string, SimulationNodeState> = {
          "__input__": { phase: "done" },
          "__output__": { phase: "active" },
        };
        for (const t of trace) {
          states[t.rule_id] = { phase: t.matched ? "done-matched" : "done-unmatched" };
        }
        setSimulationStates(states);
        setSimulationOutput(output);
      });

      // Final step: all done
      steps.push(() => {
        const states: Record<string, SimulationNodeState> = {
          "__input__": { phase: "done" },
          "__output__": { phase: "done" },
        };
        for (const t of trace) {
          states[t.rule_id] = { phase: t.matched ? "done-matched" : "done-unmatched" };
        }
        setSimulationStates(states);
      });

      steps.forEach((fn, i) => {
        const delay = (i + 1) * STEP_MS;
        const timer = setTimeout(fn, delay);
        animationTimersRef.current.push(timer);
      });

      // Switch to canvas tab so the animation is visible
      setActiveTabId(CANVAS_TAB.id);
    },
    []
  );

  const activeTab = tabs.find((t) => t.id === activeTabId) || CANVAS_TAB;

  // Sync tab labels to node names
  useEffect(() => {
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.type !== "table" || !tab.nodeId) return tab;
        const node = dsl.nodes.find((n) => n.id === tab.nodeId);
        if (!node) return tab;
        const label = node.name || "Untitled";
        if (tab.label === label) return tab;
        return { ...tab, label };
      })
    );
  }, [dsl.nodes]);

  // Remove tabs for deleted nodes
  useEffect(() => {
    const nodeIds = new Set(dsl.nodes.map((n) => n.id));
    setTabs((prev) => {
      const filtered = prev.filter(
        (t) => t.type !== "table" || (t.nodeId && nodeIds.has(t.nodeId))
      );
      if (filtered.length !== prev.length) {
        if (!filtered.find((t) => t.id === activeTabId)) {
          setActiveTabId(CANVAS_TAB.id);
        }
        return filtered;
      }
      return prev;
    });
  }, [dsl.nodes, activeTabId]);

  if (loading) {
    return (
      <div style={{ padding: 32 }}>
        <Skeleton width="200px" height="28px" />
        <div style={{ marginTop: 16 }}>
          <Skeleton width="100%" height="400px" />
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <PageHeader eyebrow={workspace} title={key} />

      {/* Tab bar */}
      <div style={tabBarContainerStyle}>
        <div style={tabListStyle}>
          {tabs.map((tab) => {
            const isActive = activeTabId === tab.id;
            const isClosable = tab.type === "table";
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                style={{
                  ...tabBtnStyle,
                  color: isActive ? "var(--ink)" : "var(--ink-muted)",
                  borderBottomColor: isActive ? "var(--ink)" : "transparent",
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {tab.type === "versions" && <VersionsIcon />}
                {tab.type === "fields" && <FieldsIcon />}
                {tab.type === "canvas" && <CanvasIcon />}
                {tab.type === "table" && <TableIcon />}
                {tab.type === "dsl" && <DslIcon />}
                <span>{tab.label}</span>
                {isClosable && (
                  <span
                    onClick={(e) => { e.stopPropagation(); handleCloseTab(tab.id); }}
                    style={tabCloseBtnStyle}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--ink)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--ink-subtle)"; }}
                  >
                    &times;
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Editor area */}
      <div style={editorAreaStyle}>
        {activeTab.type === "versions" && (
          <div style={scrollWrapperStyle}>
            <VersionsPanel
              workspace={workspace}
              rulesetKey={key}
              canEdit={canEdit}
              dirty={dirty}
              currentDsl={JSON.stringify(dslToApi(dsl), null, 2)}
              onRollback={handleRollback}
            />
          </div>
        )}
        {activeTab.type === "fields" && (
          <div style={scrollWrapperStyle}>
            <FieldsEditor
              schema={dsl.schema}
              onChange={handleSchemaChange}
              readOnly={!canEdit}
            />
          </div>
        )}
        {activeTab.type === "canvas" && (
          <Canvas
            dsl={dsl}
            onChange={setDsl}
            onOpenTable={handleOpenTable}
            simulationStates={simulationStates}
            simulationOutput={simulationOutput}
          />
        )}
        {activeTab.type === "table" && activeTab.nodeId && (
          <div style={scrollWrapperStyle}>
            <RuleTableEditor
              dsl={dsl}
              nodeId={activeTab.nodeId}
              onChange={setDsl}
            />
          </div>
        )}
        {activeTab.type === "dsl" && (
          <div style={{ overflow: "auto", padding: "20px 24px", boxSizing: "border-box", background: "var(--surface)", height: "100%" }}>
            <div style={{ height: 480 }}>
              <DslEditor dsl={dsl} onChange={setDsl} readOnly={!canEdit} />
            </div>
          </div>
        )}
      </div>

      <SimulatorPanel
        workspace={workspace}
        rulesetKey={key}
        dsl={dsl}
        collapsed={!simulatorOpen}
        onToggle={() => setSimulatorOpen((v) => !v)}
        onSimulated={handleSimulated}
      />

      {/* Save bar */}
      {canEdit && (
        <SaveActions
          dirty={dirty}
          saving={saving}
          publishing={publishing}
          publishSuccess={publishSuccess}
          onDiscard={handleDiscard}
          onSave={handleSave}
          onPublish={handlePublish}
        />
      )}

      {/* Publish diff confirmation overlay */}
      {publishDiffLatestDsl != null && (
        <PublishDiffOverlay
          currentDsl={JSON.stringify(dslToApi(dsl), null, 2)}
          latestDsl={publishDiffLatestDsl}
          onConfirm={async () => {
            setPublishDiffLatestDsl(null);
            await doPublish();
          }}
          onCancel={() => setPublishDiffLatestDsl(null)}
        />
      )}
    </div>
  );
}

function SaveActions({
  dirty,
  saving,
  publishing,
  publishSuccess,
  onDiscard,
  onSave,
  onPublish,
}: {
  dirty: boolean;
  saving: boolean;
  publishing: boolean;
  publishSuccess: boolean;
  onDiscard: () => void;
  onSave: () => void;
  onPublish: () => void;
}) {
  return (
    <div style={saveBarStyle}>
      <div style={saveBarInnerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, visibility: dirty ? "visible" : "hidden" }}>
          <span style={saveDotStyle} />
          <span style={saveTextStyle}>Unsaved changes</span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Button variant="ghost" size="md" disabled={!dirty} onClick={onDiscard}>
            Discard
          </Button>
          <Button variant="ghost" size="md" disabled={!dirty} loading={saving} onClick={onSave}>
            Save draft
          </Button>
          <Button
            variant="primary"
            size="md"
            loading={publishing && !publishSuccess}
            onClick={onPublish}
            style={publishSuccess ? { background: "#16A34A", borderColor: "#16A34A" } : {}}
          >
            {publishSuccess ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 7.5L5.5 10L11 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Published!
              </span>
            ) : "Publish"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function VersionsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <path d="M7 1V7L10 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function FieldsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <path d="M2 4H12M2 7H9M2 10H11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function CanvasIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <rect x="1" y="5" width="3" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
      <rect x="5.5" y="3" width="3" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
      <rect x="10" y="6" width="3" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4 7H5.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8.5 5.5H10" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function TableIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <rect x="1.5" y="2" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1.5 5.5H12.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5 5.5V12" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function DslIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <path d="M4 4L1.5 7L4 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 4L12.5 7L10 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.5 2.5L5.5 11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

const pageStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  overflow: "hidden",
};

const tabBarContainerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  borderBottom: "1px solid var(--border)",
  padding: "0 32px",
  background: "var(--white)",
  flexShrink: 0,
};

const tabListStyle: CSSProperties = {
  display: "flex",
  gap: 0,
  overflow: "auto",
  flex: 1,
};

const tabBtnStyle: CSSProperties = {
  background: "none",
  border: "none",
  borderBottom: "2px solid transparent",
  cursor: "pointer",
  fontFamily: "var(--font-sans)",
  fontSize: 12,
  padding: "10px 14px",
  display: "flex",
  alignItems: "center",
  gap: 6,
  whiteSpace: "nowrap",
  transition: "color 0.15s",
};

const tabCloseBtnStyle: CSSProperties = {
  fontSize: 14,
  lineHeight: 1,
  color: "var(--ink-subtle)",
  cursor: "pointer",
  marginLeft: 2,
  padding: "0 2px",
};

const editorAreaStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: "hidden",
  position: "relative",
};

const scrollWrapperStyle: CSSProperties = {
  overflowY: "auto",
  overflowX: "hidden",
  height: "100%",
  boxSizing: "border-box",
};

const saveBarStyle: CSSProperties = {
  flexShrink: 0,
  background: "var(--white)",
  borderTop: "1px solid var(--border)",
  padding: "16px 32px",
};

const saveBarInnerStyle: CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const saveDotStyle: CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: "var(--ink)",
  flexShrink: 0,
};

const saveTextStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 500,
  color: "var(--ink-muted)",
};

function PublishDiffOverlay({
  currentDsl,
  latestDsl,
  onConfirm,
  onCancel,
}: {
  currentDsl: string;
  latestDsl: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const diffLines = useMemo(() => computeLineDiff(currentDsl, latestDsl), [currentDsl, latestDsl]);

  return (
    <div style={overlayBackdropStyle}>
      <div style={overlayPanelStyle}>
        <div style={overlayHeaderStyle}>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
            Review changes before publishing
          </span>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--ink-muted)" }}>
            draft → latest published
          </span>
        </div>
        <div style={overlayDiffBodyStyle}>
          <div style={overlayColStyle}>
            <div style={overlayColHeaderStyle}>draft (to be published)</div>
            <pre style={overlayPreStyle}>
              {diffLines.map((line, i) => (
                <div
                  key={i}
                  style={{
                    padding: "0 12px",
                    whiteSpace: "pre",
                    minHeight: "1.6em",
                    background: line.type === "added" ? "rgba(22,163,74,0.08)" : "transparent",
                    color: line.type === "added" ? "#15803D" : "var(--ink-muted)",
                  }}
                >
                  {line.type === "added" ? "+ " : "  "}
                  {line.from ?? ""}
                </div>
              ))}
            </pre>
          </div>
          <div style={{ ...overlayColStyle, borderLeft: "1px solid var(--border)" }}>
            <div style={overlayColHeaderStyle}>latest published</div>
            <pre style={overlayPreStyle}>
              {diffLines.map((line, i) => (
                <div
                  key={i}
                  style={{
                    padding: "0 12px",
                    whiteSpace: "pre",
                    minHeight: "1.6em",
                    background: line.type === "removed" ? "rgba(220,38,38,0.08)" : "transparent",
                    color: line.type === "removed" ? "#B91C1C" : "var(--ink-muted)",
                  }}
                >
                  {line.type === "removed" ? "− " : "  "}
                  {line.to ?? ""}
                </div>
              ))}
            </pre>
          </div>
        </div>
        <div style={overlayFooterStyle}>
          <button style={overlayCancelBtnStyle} onClick={onCancel}>Cancel</button>
          <button style={overlayConfirmBtnStyle} onClick={onConfirm}>Confirm &amp; Publish</button>
        </div>
      </div>
    </div>
  );
}

type DiffLineType = { type: "same" | "added" | "removed"; from?: string; to?: string };

function computeLineDiff(fromText: string, toText: string): DiffLineType[] {
  const a = fromText.split("\n");
  const b = toText.split("\n");
  const MAX = 500;
  if (a.length > MAX || b.length > MAX) {
    const len = Math.max(a.length, b.length);
    return Array.from({ length: len }, (_, i) => {
      if (a[i] === b[i]) return { type: "same" as const, from: a[i], to: b[i] };
      const r: DiffLineType[] = [];
      if (a[i] !== undefined) r.push({ type: "added", from: a[i] });
      if (b[i] !== undefined) r.push({ type: "removed", to: b[i] });
      return r;
    }).flat();
  }
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--)
    for (let j = n - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i+1][j+1]+1 : Math.max(dp[i+1][j], dp[i][j+1]);
  const result: DiffLineType[] = [];
  let i = 0, j = 0;
  while (i < m || j < n) {
    if (i < m && j < n && a[i] === b[j]) {
      result.push({ type: "same", from: a[i], to: b[j] }); i++; j++;
    } else if (j < n && (i >= m || dp[i][j+1] >= dp[i+1][j])) {
      result.push({ type: "removed", to: b[j] }); j++;
    } else {
      result.push({ type: "added", from: a[i] }); i++;
    }
  }
  return result;
}

const overlayBackdropStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  zIndex: 1000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const overlayPanelStyle: CSSProperties = {
  background: "var(--white)",
  borderRadius: 12,
  boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
  width: "min(900px, 96vw)",
  maxHeight: "80vh",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const overlayHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "14px 20px",
  borderBottom: "1px solid var(--border)",
  flexShrink: 0,
};

const overlayDiffBodyStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  flex: 1,
  overflow: "auto",
  minHeight: 0,
};

const overlayColStyle: CSSProperties = {
  overflow: "auto",
};

const overlayColHeaderStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--ink-subtle)",
  padding: "6px 12px",
  borderBottom: "1px solid var(--border)",
  background: "var(--surface)",
  position: "sticky",
  top: 0,
};

const overlayPreStyle: CSSProperties = {
  margin: 0,
  padding: 0,
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  lineHeight: 1.6,
  overflow: "visible",
};

const overlayFooterStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  padding: "12px 20px",
  borderTop: "1px solid var(--border)",
  flexShrink: 0,
};

const overlayCancelBtnStyle: CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  padding: "6px 16px",
  borderRadius: 6,
  border: "1px solid var(--border)",
  background: "var(--white)",
  color: "var(--ink-muted)",
  cursor: "pointer",
};

const overlayConfirmBtnStyle: CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  fontWeight: 600,
  padding: "6px 16px",
  borderRadius: 6,
  border: "none",
  background: "var(--ink)",
  color: "var(--white)",
  cursor: "pointer",
};

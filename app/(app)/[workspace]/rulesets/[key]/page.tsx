"use client";

import { useState, useEffect, useCallback, useRef, CSSProperties } from "react";
import { useParams } from "next/navigation";
import type { DSL, ApiDSL } from "@/lib/types";
import { apiToDsl } from "@/lib/types";
import * as api from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/contexts/AuthContext";
import PageHeader from "@/components/layout/PageHeader";
import VersionsPanel from "@/components/editors/VersionsPanel";
import FieldsEditor from "@/components/editors/FieldsEditor";
import RuleTableEditor from "@/components/editors/RuleTableEditor";
import Canvas from "@/components/editors/Canvas";
import SimulatorPanel from "@/components/editors/SimulatorPanel";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";

const emptyDsl: DSL = {
  dsl_version: "v1",
  strategy: "first_match",
  schema: {},
  rules: [],
};

interface EditorTab {
  id: string;
  label: string;
  type: "versions" | "fields" | "canvas" | "table";
  ruleId?: string;
}

const VERSIONS_TAB: EditorTab = { id: "__versions__", label: "Versions", type: "versions" };
const FIELDS_TAB: EditorTab = { id: "__fields__", label: "Fields", type: "fields" };
const CANVAS_TAB: EditorTab = { id: "__canvas__", label: "Canvas", type: "canvas" };

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

  const [tabs, setTabs] = useState<EditorTab[]>([VERSIONS_TAB, FIELDS_TAB, CANVAS_TAB]);
  const [activeTabId, setActiveTabId] = useState(FIELDS_TAB.id);
  const [simulatorOpen, setSimulatorOpen] = useState(false);

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
    (ruleId: string) => {
      const existing = tabs.find((t) => t.ruleId === ruleId);
      if (existing) {
        setActiveTabId(existing.id);
        return;
      }
      const rule = dsl.rules.find((r) => r.id === ruleId);
      const label = rule?.name || "Untitled";
      const newTab: EditorTab = {
        id: `table_${ruleId}`,
        label,
        type: "table",
        ruleId,
      };
      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(newTab.id);
    },
    [tabs, dsl.rules]
  );

  const handleCloseTab = useCallback(
    (tabId: string) => {
      if (tabId === VERSIONS_TAB.id || tabId === FIELDS_TAB.id || tabId === CANVAS_TAB.id) return;
      setTabs((prev) => prev.filter((t) => t.id !== tabId));
      if (activeTabId === tabId) {
        setActiveTabId(CANVAS_TAB.id);
      }
    },
    [activeTabId]
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

  const handlePublish = async () => {
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

  const handleSchemaChange = (schema: DSL["schema"]) => {
    setDsl((prev) => ({ ...prev, schema }));
  };

  const activeTab = tabs.find((t) => t.id === activeTabId) || CANVAS_TAB;

  // Sync tab labels to rule names
  useEffect(() => {
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.type !== "table" || !tab.ruleId) return tab;
        const rule = dsl.rules.find((r) => r.id === tab.ruleId);
        if (!rule) return tab;
        const label = rule.name || "Untitled";
        if (tab.label === label) return tab;
        return { ...tab, label };
      })
    );
  }, [dsl.rules]);

  // Remove tabs for deleted rules
  useEffect(() => {
    const ruleIds = new Set(dsl.rules.map((r) => r.id));
    setTabs((prev) => {
      const filtered = prev.filter(
        (t) => t.type !== "table" || (t.ruleId && ruleIds.has(t.ruleId))
      );
      if (filtered.length !== prev.length) {
        if (!filtered.find((t) => t.id === activeTabId)) {
          setActiveTabId(CANVAS_TAB.id);
        }
        return filtered;
      }
      return prev;
    });
  }, [dsl.rules, activeTabId]);

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

      {/* Tab bar + strategy */}
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
                  borderBottomColor: isActive ? "var(--orange)" : "transparent",
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {tab.type === "versions" && <VersionsIcon />}
                {tab.type === "fields" && <FieldsIcon />}
                {tab.type === "canvas" && <CanvasIcon />}
                {tab.type === "table" && <TableIcon />}
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

        <div style={tabBarRightStyle}>
          <div style={strategyGroupStyle}>
            <span style={strategyLabelStyle}>Strategy</span>
            <select
              value={dsl.strategy}
              onChange={(e) =>
                setDsl((prev) => ({
                  ...prev,
                  strategy: e.target.value as DSL["strategy"],
                }))
              }
              disabled={!canEdit}
              style={strategySelectStyle}
            >
              <option value="first_match">first_match</option>
              <option value="all_matches">all_matches</option>
            </select>
          </div>
        </div>
      </div>

      {/* Editor area */}
      <div style={editorAreaStyle}>
        {activeTab.type === "versions" && (
          <div style={scrollWrapperStyle}>
            <VersionsPanel workspace={workspace} rulesetKey={key} />
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
          <Canvas dsl={dsl} onChange={setDsl} onOpenTable={handleOpenTable} />
        )}
        {activeTab.type === "table" && activeTab.ruleId && (
          <div style={scrollWrapperStyle}>
            <RuleTableEditor
              dsl={dsl}
              ruleId={activeTab.ruleId}
              onChange={setDsl}
            />
          </div>
        )}
      </div>

      {/* Simulator */}
      <SimulatorPanel
        workspace={workspace}
        rulesetKey={key}
        dsl={dsl}
        collapsed={!simulatorOpen}
        onToggle={() => setSimulatorOpen((v) => !v)}
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
  const visible = true;

  return (
    <div style={{ ...saveBarStyle, transform: visible ? "translateY(0)" : "translateY(100%)" }}>
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
  fontFamily: "var(--font-nunito)",
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

const tabBarRightStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  flexShrink: 0,
  paddingLeft: 16,
};

const strategyGroupStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const strategyLabelStyle: CSSProperties = {
  fontFamily: "var(--font-nunito)",
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--ink-subtle)",
};

const strategySelectStyle: CSSProperties = {
  fontFamily: "var(--font-nunito)",
  fontSize: 11,
  padding: "4px 8px",
  borderRadius: 6,
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "var(--border-med)",
  background: "var(--white)",
  color: "var(--ink)",
  cursor: "pointer",
  outline: "none",
};

const editorAreaStyle: CSSProperties = {
  flex: 1,
  overflow: "hidden",
  position: "relative",
};

const scrollWrapperStyle: CSSProperties = {
  overflow: "auto",
  height: "100%",
};

const saveBarStyle: CSSProperties = {
  position: "fixed",
  bottom: 0,
  left: 240,
  right: 0,
  zIndex: 100,
  background: "var(--white)",
  borderTop: "1px solid var(--border)",
  padding: "16px 32px",
  transition: "transform 0.25s ease",
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
  background: "var(--orange)",
  flexShrink: 0,
};

const saveTextStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 500,
  color: "var(--ink-muted)",
};

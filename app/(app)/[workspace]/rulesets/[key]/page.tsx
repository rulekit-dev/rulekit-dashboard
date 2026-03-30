"use client";

import { useState, useEffect, useCallback, useRef, CSSProperties } from "react";
import { useParams } from "next/navigation";
import type { DSL, ApiDSL, SchemaField } from "@/lib/types";
import { apiToDsl } from "@/lib/types";
import * as api from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/contexts/AuthContext";
import PageHeader from "@/components/layout/PageHeader";
import VersionsPanel from "@/components/editors/VersionsPanel";
import RuleTableEditor from "@/components/editors/RuleTableEditor";
import Canvas from "@/components/editors/Canvas";
import FieldsEditor from "@/components/editors/FieldsEditor";
import SimulatorPanel from "@/components/editors/SimulatorPanel";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";

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
  type: "versions" | "fields" | "canvas" | "table";
  nodeId?: string;
}

const VERSIONS_TAB: EditorTab = { id: "__versions__", label: "Versions", type: "versions" };
const FIELDS_TAB: EditorTab = { id: "__fields__", label: "Schema", type: "fields" };
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
  const [activeTabId, setActiveTabId] = useState(CANVAS_TAB.id);
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
      if (tabId === VERSIONS_TAB.id || tabId === FIELDS_TAB.id || tabId === CANVAS_TAB.id) return;
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
        {activeTab.type === "table" && activeTab.nodeId && (
          <div style={scrollWrapperStyle}>
            <RuleTableEditor
              dsl={dsl}
              nodeId={activeTab.nodeId}
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

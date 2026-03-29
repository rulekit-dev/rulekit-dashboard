"use client";

import React, { useState, useCallback, CSSProperties } from "react";
import type { DSL } from "@/lib/types";
import * as api from "@/lib/api";
import Button from "@/components/ui/Button";

interface TraceEntry {
  rule_id: string;
  rule_name: string;
  matched: boolean;
  duration_us: number;
}

interface SimulatorPanelProps {
  workspace: string;
  rulesetKey: string;
  dsl: DSL;
  collapsed: boolean;
  onToggle: () => void;
}

const TABS = ["Output", "Input", "Trace"] as const;
type Tab = (typeof TABS)[number];

function buildDefaultInput(dsl: DSL): Record<string, unknown> {
  const input: Record<string, unknown> = {};
  // Build input from the entry node's schema
  const entryNode = dsl.nodes.find((n) => n.id === dsl.entry);
  if (!entryNode) return input;
  for (const [field, def] of Object.entries(entryNode.schema)) {
    switch (def.type) {
      case "number":
        input[field] = 0;
        break;
      case "boolean":
        input[field] = false;
        break;
      case "enum":
        input[field] = def.options?.[0] ?? "";
        break;
      default:
        input[field] = "";
    }
  }
  return input;
}

export default function SimulatorPanel({
  workspace,
  rulesetKey,
  dsl,
  collapsed,
  onToggle,
}: SimulatorPanelProps) {
  const [requestText, setRequestText] = useState(() =>
    JSON.stringify(buildDefaultInput(dsl), null, 2)
  );
  const [output, setOutput] = useState<Record<string, unknown> | null>(null);
  const [trace, setTrace] = useState<TraceEntry[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("Output");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalDuration, setTotalDuration] = useState<number | null>(null);

  const handleRun = useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      const input = JSON.parse(requestText);
      const start = performance.now();
      const res = await api.evaluateRuleset(workspace, rulesetKey, input);
      const elapsed = Math.round((performance.now() - start) * 1000);
      setTotalDuration(elapsed);
      setOutput(res.result);
      setTrace(res.trace || []);
      setActiveTab("Output");
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || "Evaluation failed");
      setOutput(null);
      setTrace([]);
    } finally {
      setRunning(false);
    }
  }, [requestText, workspace, rulesetKey]);

  const handleReset = useCallback(() => {
    setRequestText(JSON.stringify(buildDefaultInput(dsl), null, 2));
    setOutput(null);
    setTrace([]);
    setError(null);
    setTotalDuration(null);
  }, [dsl]);

  if (collapsed) {
    return (
      <div style={collapsedBarStyle}>
        <button onClick={onToggle} style={toggleBtnStyle}>
          <ChevronUpIcon />
          <span style={labelStyle}>Simulator</span>
        </button>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <div style={handleBarStyle}>
        <button onClick={onToggle} style={toggleBtnStyle}>
          <ChevronDownIcon />
          <span style={labelStyle}>Simulator</span>
        </button>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {totalDuration != null && (
            <span style={durationStyle}>{(totalDuration / 1000).toFixed(1)}ms</span>
          )}
          <button onClick={handleReset} style={resetBtnStyle}>
            Reset
          </button>
          <Button variant="primary" size="sm" onClick={handleRun} loading={running}>
            Run
          </Button>
        </div>
      </div>

      <div style={bodyStyle}>
        <div style={requestSideStyle}>
          <div style={sectionHeaderStyle}>Request</div>
          <textarea
            value={requestText}
            onChange={(e) => setRequestText(e.target.value)}
            style={textareaStyle}
            spellCheck={false}
          />
        </div>

        <div style={dividerStyle} />

        <div style={responseSideStyle}>
          <div style={tabBarStyle}>
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  ...tabStyle,
                  color: activeTab === tab ? "var(--orange)" : "var(--ink-muted)",
                  borderBottomColor:
                    activeTab === tab ? "var(--orange)" : "transparent",
                  fontWeight: activeTab === tab ? 600 : 400,
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div style={resultAreaStyle}>
            {error && <div style={errorStyle}>{error}</div>}

            {activeTab === "Output" && !error && (
              <pre style={preStyle}>
                {output ? JSON.stringify(output, null, 2) : "Run to see output"}
              </pre>
            )}

            {activeTab === "Input" && (
              <pre style={preStyle}>
                {requestText}
              </pre>
            )}

            {activeTab === "Trace" && !error && (
              <div style={{ padding: 0 }}>
                {trace.length === 0 ? (
                  <pre style={preStyle}>Run to see trace</pre>
                ) : (
                  trace.map((t, i) => (
                    <div key={i} style={traceRowStyle}>
                      <div style={traceIndicatorStyle(t.matched)} />
                      <span style={traceNameStyle}>{t.rule_name}</span>
                      <span style={traceDurationStyle}>{t.duration_us}us</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChevronUpIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M3 7.5L6 4.5L9 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const collapsedBarStyle: CSSProperties = {
  borderTop: "1px solid var(--border)",
  background: "var(--white)",
  padding: "6px 16px",
  flexShrink: 0,
};

const panelStyle: CSSProperties = {
  borderTop: "1px solid var(--border)",
  background: "var(--white)",
  flexShrink: 0,
  display: "flex",
  flexDirection: "column",
  height: 280,
  minHeight: 180,
};

const handleBarStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "6px 16px",
  borderBottom: "1px solid var(--border)",
  flexShrink: 0,
};

const toggleBtnStyle: CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 0",
  color: "var(--ink-muted)",
};

const labelStyle: CSSProperties = {
  fontFamily: "var(--font-nunito)",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--ink)",
};

const durationStyle: CSSProperties = {
  fontFamily: "var(--font-dm-mono)",
  fontSize: 11,
  color: "var(--ink-subtle)",
};

const resetBtnStyle: CSSProperties = {
  background: "none",
  border: "1px solid var(--border)",
  borderRadius: 6,
  cursor: "pointer",
  fontFamily: "var(--font-nunito)",
  fontSize: 11,
  color: "var(--ink-muted)",
  padding: "4px 10px",
};

const bodyStyle: CSSProperties = {
  display: "flex",
  flex: 1,
  overflow: "hidden",
};

const requestSideStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const sectionHeaderStyle: CSSProperties = {
  fontFamily: "var(--font-nunito)",
  fontSize: 10,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "var(--ink-subtle)",
  padding: "8px 12px 4px",
  flexShrink: 0,
};

const textareaStyle: CSSProperties = {
  flex: 1,
  resize: "none",
  border: "none",
  outline: "none",
  fontFamily: "var(--font-dm-mono)",
  fontSize: 12,
  lineHeight: 1.6,
  padding: "4px 12px 12px",
  color: "var(--ink)",
  background: "transparent",
};

const dividerStyle: CSSProperties = {
  width: 1,
  background: "var(--border)",
  flexShrink: 0,
};

const responseSideStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const tabBarStyle: CSSProperties = {
  display: "flex",
  gap: 0,
  padding: "0 12px",
  borderBottom: "1px solid var(--border)",
  flexShrink: 0,
};

const tabStyle: CSSProperties = {
  background: "none",
  border: "none",
  borderBottom: "2px solid transparent",
  cursor: "pointer",
  fontFamily: "var(--font-nunito)",
  fontSize: 11,
  padding: "8px 12px",
  transition: "color 0.15s",
};

const resultAreaStyle: CSSProperties = {
  flex: 1,
  overflow: "auto",
};

const preStyle: CSSProperties = {
  fontFamily: "var(--font-dm-mono)",
  fontSize: 12,
  lineHeight: 1.6,
  color: "var(--ink)",
  padding: "8px 12px",
  margin: 0,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

const errorStyle: CSSProperties = {
  fontFamily: "var(--font-nunito)",
  fontSize: 12,
  color: "#DC2626",
  padding: "8px 12px",
};

const traceRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 12px",
  borderBottom: "1px solid var(--border)",
  fontFamily: "var(--font-nunito)",
  fontSize: 11,
};

const traceIndicatorStyle = (matched: boolean): CSSProperties => ({
  width: 6,
  height: 6,
  borderRadius: "50%",
  background: matched ? "var(--green)" : "var(--border-med)",
  flexShrink: 0,
});

const traceNameStyle: CSSProperties = {
  flex: 1,
  color: "var(--ink)",
};

const traceDurationStyle: CSSProperties = {
  fontFamily: "var(--font-dm-mono)",
  fontSize: 10,
  color: "var(--ink-subtle)",
};

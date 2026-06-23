"use client";

import React, { useState, useCallback, useMemo, CSSProperties } from "react";
import type { DSL, SchemaField } from "@/lib/types";
import * as api from "@/lib/api";
import Button from "@/components/ui/Button";

interface TraceEntry {
  rule_id: string;
  rule_name: string;
  matched: boolean;
  duration_us: number;
}

interface SimulationResult {
  trace: TraceEntry[];
  output: Record<string, unknown>;
}

interface SimulatorPanelProps {
  workspace: string;
  rulesetKey: string;
  dsl: DSL;
  collapsed: boolean;
  onToggle: () => void;
  onSimulated?: (result: SimulationResult | null) => void;
}

const TABS = ["Output", "Trace", "JSON"] as const;
type Tab = (typeof TABS)[number];

function inputFields(dsl: DSL): [string, SchemaField][] {
  return Object.entries(dsl.schema).filter(([, f]) => f.direction === "input");
}

function buildDefaultValues(dsl: DSL): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const [field, def] of inputFields(dsl)) {
    switch (def.type) {
      case "number":  values[field] = 0; break;
      case "boolean": values[field] = false; break;
      case "enum":    values[field] = def.options?.[0] ?? ""; break;
      default:        values[field] = "";
    }
  }
  return values;
}

export default function SimulatorPanel({
  workspace,
  rulesetKey,
  dsl,
  collapsed,
  onToggle,
  onSimulated,
}: SimulatorPanelProps) {
  const [values, setValues] = useState<Record<string, unknown>>(() => buildDefaultValues(dsl));
  const [output, setOutput] = useState<Record<string, unknown> | null>(null);
  const [trace, setTrace] = useState<TraceEntry[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("Output");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalDuration, setTotalDuration] = useState<number | null>(null);

  const fields = useMemo(() => inputFields(dsl), [dsl]);

  const handleRun = useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      const start = performance.now();
      const res = await api.evaluateRuleset(workspace, rulesetKey, values);
      const elapsed = Math.round((performance.now() - start) * 1000);
      setTotalDuration(elapsed);
      setOutput(res.result);
      const traceData = res.trace || [];
      setTrace(traceData);
      setActiveTab("Output");
      onSimulated?.({ trace: traceData, output: res.result });
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || "Evaluation failed");
      setOutput(null);
      setTrace([]);
    } finally {
      setRunning(false);
    }
  }, [values, workspace, rulesetKey, onSimulated]);

  const handleReset = useCallback(() => {
    setValues(buildDefaultValues(dsl));
    setOutput(null);
    setTrace([]);
    setError(null);
    setTotalDuration(null);
    onSimulated?.(null);
  }, [dsl, onSimulated]);

  const setValue = useCallback((field: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  }, []);

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
          <button onClick={handleReset} style={resetBtnStyle}>Reset</button>
          <Button variant="primary" size="sm" onClick={handleRun} loading={running}>Run</Button>
        </div>
      </div>

      <div style={bodyStyle}>
        {/* Left: schema-driven input form */}
        <div style={requestSideStyle}>
          <div style={sectionHeaderStyle}>Input</div>
          {fields.length === 0 ? (
            <div style={emptyStyle}>No input fields defined in schema.</div>
          ) : (
            <div style={fieldListStyle}>
              {fields.map(([field, def]) => (
                <FieldRow
                  key={field}
                  field={field}
                  def={def}
                  value={values[field]}
                  onChange={(v) => setValue(field, v)}
                />
              ))}
            </div>
          )}
        </div>

        <div style={dividerStyle} />

        {/* Right: output / trace / raw JSON */}
        <div style={responseSideStyle}>
          <div style={tabBarStyle}>
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  ...tabStyle,
                  color: activeTab === tab ? "var(--ink)" : "var(--ink-muted)",
                  borderBottomColor: activeTab === tab ? "var(--ink)" : "transparent",
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
              output ? (
                <div style={outputGridStyle}>
                  {Object.entries(output).map(([k, v]) => (
                    <div key={k} style={outputRowStyle}>
                      <span style={outputKeyStyle}>{k}</span>
                      <span style={outputValStyle}>{JSON.stringify(v)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={emptyStyle}>Run to see output</div>
              )
            )}

            {activeTab === "Trace" && !error && (
              trace.length === 0 ? (
                <div style={emptyStyle}>Run to see trace</div>
              ) : (
                trace.map((t, i) => (
                  <div key={i} style={traceRowStyle}>
                    <div style={traceIndicatorStyle(t.matched)} />
                    <span style={traceNameStyle}>{t.rule_name || t.rule_id}</span>
                    <span style={traceDurationStyle}>{t.duration_us}μs</span>
                  </div>
                ))
              )
            )}

            {activeTab === "JSON" && (
              <pre style={preStyle}>{JSON.stringify(values, null, 2)}</pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Per-field input control ---

function FieldRow({
  field,
  def,
  value,
  onChange,
}: {
  field: string;
  def: SchemaField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  return (
    <div style={fieldRowStyle}>
      <label style={fieldLabelStyle} title={field}>{field}</label>
      <div style={fieldControlStyle}>
        <FieldControl field={field} def={def} value={value} onChange={onChange} />
      </div>
      <span style={fieldTypeStyle}>{def.type}</span>
    </div>
  );
}

function FieldControl({
  field,
  def,
  value,
  onChange,
}: {
  field: string;
  def: SchemaField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  switch (def.type) {
    case "number":
      return (
        <input
          type="number"
          value={value as number}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
          style={inputStyle}
        />
      );

    case "boolean":
      return (
        <button
          role="switch"
          aria-checked={!!value}
          onClick={() => onChange(!value)}
          style={toggleStyle(!!value)}
        >
          <span style={toggleThumbStyle(!!value)} />
        </button>
      );

    case "enum":
      return (
        <select
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          style={selectStyle}
        >
          {(def.options ?? []).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );

    default:
      return (
        <input
          type="text"
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          style={inputStyle}
          placeholder={field}
        />
      );
  }
}

// --- Icons ---

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

// --- Styles ---

const collapsedBarStyle: CSSProperties = {
  borderTop: "1px solid var(--border)",
  background: "var(--white)",
  padding: "6px 16px",
  flexShrink: 0,
  zIndex: 10,
  position: "relative",
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
  fontFamily: "var(--font-sans)",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--ink)",
};

const durationStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--ink-subtle)",
};

const resetBtnStyle: CSSProperties = {
  background: "none",
  border: "1px solid var(--border)",
  borderRadius: 6,
  cursor: "pointer",
  fontFamily: "var(--font-sans)",
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
  minWidth: 0,
};

const sectionHeaderStyle: CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 10,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "var(--ink-subtle)",
  padding: "8px 12px 4px",
  flexShrink: 0,
};

const fieldListStyle: CSSProperties = {
  overflowY: "auto",
  flex: 1,
  padding: "4px 0 8px",
};

const fieldRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "4px 12px",
  minHeight: 32,
};

const fieldLabelStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--ink)",
  width: 120,
  flexShrink: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const fieldControlStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
};

const fieldTypeStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  color: "var(--ink-subtle)",
  flexShrink: 0,
  width: 48,
  textAlign: "right",
};

const inputStyle: CSSProperties = {
  width: "100%",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--ink)",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 5,
  padding: "3px 8px",
  outline: "none",
  boxSizing: "border-box",
};

const selectStyle: CSSProperties = {
  width: "100%",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--ink)",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 5,
  padding: "3px 8px",
  outline: "none",
  boxSizing: "border-box",
  cursor: "pointer",
};

const toggleStyle = (on: boolean): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  width: 36,
  height: 20,
  borderRadius: 10,
  background: on ? "var(--ink)" : "var(--border-med, #d1d5db)",
  border: "none",
  cursor: "pointer",
  padding: "0 3px",
  transition: "background 0.15s",
  flexShrink: 0,
});

const toggleThumbStyle = (on: boolean): CSSProperties => ({
  width: 14,
  height: 14,
  borderRadius: "50%",
  background: "var(--white)",
  transform: on ? "translateX(16px)" : "translateX(0)",
  transition: "transform 0.15s",
  flexShrink: 0,
});

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
  minWidth: 0,
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
  fontFamily: "var(--font-sans)",
  fontSize: 11,
  padding: "8px 12px",
  transition: "color 0.15s",
};

const resultAreaStyle: CSSProperties = {
  flex: 1,
  overflow: "auto",
};

const emptyStyle: CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 12,
  color: "var(--ink-subtle)",
  padding: "12px",
};

const outputGridStyle: CSSProperties = {
  padding: "4px 0 8px",
};

const outputRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "4px 12px",
  minHeight: 28,
};

const outputKeyStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--ink-muted)",
  width: 120,
  flexShrink: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const outputValStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--ink)",
  fontWeight: 600,
};

const preStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  lineHeight: 1.6,
  color: "var(--ink)",
  padding: "8px 12px",
  margin: 0,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

const errorStyle: CSSProperties = {
  fontFamily: "var(--font-sans)",
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
  fontFamily: "var(--font-sans)",
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
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  color: "var(--ink-subtle)",
};

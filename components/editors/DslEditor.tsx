"use client";

import { useState, useCallback, useRef, useEffect, useMemo, CSSProperties } from "react";
import type { DSL, ApiDSL } from "@/lib/types";
import { dslToApi, apiToDsl } from "@/lib/types";

// ─── Colour scheme — One Dark Pro inspired, modern & softer ──────────────────
const T = {
  bg:           "#282C34",   // editor background
  bgAlt:        "#21252B",   // slightly darker — action bar, gutter
  bgHover:      "#2C313C",   // hover state
  activeLine:   "#2C313A",   // hovered line
  gutter:       "#21252B",
  gutterFg:     "#4B5263",   // line numbers
  gutterBorder: "#181A1F",
  text:         "#ABB2BF",   // default text
  key:          "#61AFEF",   // sky blue — object keys
  string:       "#98C379",   // sage green — strings
  number:       "#E5C07B",   // warm yellow — numbers
  boolean:      "#C678DD",   // purple — booleans
  null:         "#56B6C2",   // teal — null
  punctuation:  "#ABB2BF",
  bracket0:     "#E06C75",   // coral — depth 0
  bracket1:     "#C678DD",   // purple — depth 1
  bracket2:     "#56B6C2",   // teal — depth 2+
  tabBar:       "#21252B",
  tabActiveBg:  "#282C34",
  tabAccent:    "#61AFEF",   // sky blue tab top border
  tabFg:        "#ABB2BF",
  statusBg:     "#21252B",
  statusFg:     "#4B5263",
  statusAccent: "#61AFEF",
  error:        "#E06C75",
  errorBg:      "rgba(224,108,117,0.1)",
  border:       "#181A1F",
  borderInner:  "#2C313C",
};

// ─── Types ────────────────────────────────────────────────────────────────────
type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
type JsonObject = { [key: string]: JsonValue };
type JsonArray  = JsonValue[];

function bracketColor(depth: number): string {
  if (depth === 0) return T.bracket0;
  if (depth === 1) return T.bracket1;
  return T.bracket2;
}

function escStr(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\t/g, "\\t");
}

function renderValue(val: JsonValue, depth: number): React.ReactNode {
  if (val === null)             return <span style={{ color: T.null }}>null</span>;
  if (typeof val === "boolean") return <span style={{ color: T.boolean }}>{String(val)}</span>;
  if (typeof val === "number")  return <span style={{ color: T.number }}>{val}</span>;
  if (typeof val === "string")  return <span style={{ color: T.string }}>"{escStr(val)}"</span>;
  if (Array.isArray(val)) {
    const bc = bracketColor(depth);
    return (
      <span>
        <span style={{ color: bc }}>[</span>
        <span style={{ color: T.gutterFg, fontSize: 10, margin: "0 4px" }}>{(val as JsonArray).length}</span>
        <span style={{ color: bc }}>]</span>
      </span>
    );
  }
  const bc = bracketColor(depth);
  const n = Object.keys(val as JsonObject).length;
  return (
    <span>
      <span style={{ color: bc }}>{"{"}</span>
      <span style={{ color: T.gutterFg, fontSize: 10, margin: "0 4px" }}>{n}</span>
      <span style={{ color: bc }}>{"}"}</span>
    </span>
  );
}

// ─── Line builder ─────────────────────────────────────────────────────────────
interface Line {
  lineNo: number;
  indent: number;
  content: React.ReactNode;
  isCollapsible: boolean;
  collapseKey?: string;
  depth: number;
}

function buildLines(
  val: JsonValue,
  collapsed: Set<string>,
  path = "root",
  depth = 0,
  isLast = true,
  keyName?: string | number,
): Line[] {
  const bc = bracketColor(depth);
  const trailing = isLast ? "" : ",";

  const keySpan = keyName !== undefined && depth > 0 ? (
    <span>
      <span style={{ color: T.key }}>
        {typeof keyName === "string" ? `"${keyName}"` : keyName}
      </span>
      <span style={{ color: T.punctuation }}>: </span>
    </span>
  ) : null;

  const isObj = val !== null && typeof val === "object" && !Array.isArray(val);
  const isArr = Array.isArray(val);

  if (isObj || isArr) {
    const open  = isArr ? "[" : "{";
    const close = isArr ? "]" : "}";
    const entries = isObj
      ? Object.entries(val as JsonObject)
      : (val as JsonArray).map((v, i) => [i, v] as [number, JsonValue]);

    if (collapsed.has(path)) {
      return [{
        lineNo: 0, indent: depth, depth, isCollapsible: true, collapseKey: path,
        content: (
          <span>
            {keySpan}
            <span style={{ color: bc }}>{open}</span>
            <span style={{ color: T.gutterFg, fontSize: 10, margin: "0 6px", fontStyle: "italic" }}>
              {entries.length} {entries.length === 1 ? "item" : "items"}
            </span>
            <span style={{ color: bc }}>{close}</span>
            <span style={{ color: T.punctuation }}>{trailing}</span>
          </span>
        ),
      }];
    }

    const lines: Line[] = [];
    lines.push({
      lineNo: 0, indent: depth, depth, isCollapsible: true, collapseKey: path,
      content: <span>{keySpan}<span style={{ color: bc }}>{open}</span></span>,
    });
    entries.forEach(([k, v], i) => {
      lines.push(...buildLines(v, collapsed, `${path}.${k}`, depth + 1, i === entries.length - 1, k));
    });
    lines.push({
      lineNo: 0, indent: depth, depth, isCollapsible: false,
      content: <span><span style={{ color: bc }}>{close}</span><span style={{ color: T.punctuation }}>{trailing}</span></span>,
    });
    return lines;
  }

  return [{
    lineNo: 0, indent: depth, depth, isCollapsible: false,
    content: (
      <span>
        {keySpan}
        {renderValue(val, depth)}
        <span style={{ color: T.punctuation }}>{trailing}</span>
      </span>
    ),
  }];
}

// ─── Tree viewer ──────────────────────────────────────────────────────────────
function JsonViewer({ value }: { value: JsonValue }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [hovLine, setHovLine] = useState<number | null>(null);

  const toggle = useCallback((key: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const lines = useMemo(() => buildLines(value, collapsed).map((l, i) => ({ ...l, lineNo: i + 1 })), [value, collapsed]);

  const INDENT = 16;
  const GUTTER = 48;

  return (
    <div style={{ userSelect: "text", minWidth: "max-content" }}>
      {lines.map((line) => (
        <div
          key={line.lineNo}
          onMouseEnter={() => setHovLine(line.lineNo)}
          onMouseLeave={() => setHovLine(null)}
          style={{
            display: "flex",
            alignItems: "flex-start",
            minHeight: 21,
            background: hovLine === line.lineNo ? T.activeLine : "transparent",
            transition: "background 0.05s",
          }}
        >
          {/* Gutter */}
          <div style={{
            width: GUTTER, flexShrink: 0,
            textAlign: "right", paddingRight: 14,
            color: hovLine === line.lineNo ? T.text : T.gutterFg,
            fontSize: 11, lineHeight: "21px", userSelect: "none",
            fontVariantNumeric: "tabular-nums",
            position: "relative",
          }}>
            {line.isCollapsible && (
              <span
                onClick={() => line.collapseKey && toggle(line.collapseKey)}
                style={{
                  position: "absolute", left: 6, top: "50%",
                  transform: `translateY(-50%) rotate(${collapsed.has(line.collapseKey ?? "") ? "0deg" : "90deg"})`,
                  color: hovLine === line.lineNo ? T.gutterFg : "transparent",
                  fontSize: 7, cursor: "pointer",
                  transition: "transform 0.12s, color 0.1s",
                  lineHeight: 1,
                }}
              >▶</span>
            )}
            {line.lineNo}
          </div>

          {/* Code */}
          <div style={{
            flex: 1, paddingLeft: line.indent * INDENT, paddingRight: 24,
            fontSize: 12.5, lineHeight: "21px",
            fontFamily: "'Menlo','Monaco','Consolas','Courier New',monospace",
            whiteSpace: "pre",
          }}>
            {line.content}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Raw editor ───────────────────────────────────────────────────────────────
function RawEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const lineCount = value.split("\n").length;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const s = ta.selectionStart, end = ta.selectionEnd;
      const next = value.substring(0, s) + "  " + value.substring(end);
      onChange(next);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 2; });
    }
  };

  return (
    <div style={{ display: "flex", height: "100%" }}>
      {/* Line numbers */}
      <div style={{
        width: 48, flexShrink: 0,
        background: T.gutter,
        borderRight: `1px solid ${T.gutterBorder}`,
        paddingTop: 10, paddingRight: 10,
        textAlign: "right",
        color: T.gutterFg,
        fontSize: 11,
        fontFamily: "'Menlo','Monaco','Consolas','Courier New',monospace",
        lineHeight: "21px",
        userSelect: "none",
        overflowY: "hidden",
        fontVariantNumeric: "tabular-nums",
      }}>
        {Array.from({ length: lineCount }, (_, i) => <div key={i}>{i + 1}</div>)}
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        autoComplete="off"
        style={{
          flex: 1, background: T.bg, color: T.text,
          border: "none", outline: "none", resize: "none",
          fontFamily: "'Menlo','Monaco','Consolas','Courier New',monospace",
          fontSize: 12.5, lineHeight: "21px",
          padding: "10px 20px",
          boxSizing: "border-box",
          caretColor: T.text,
        }}
      />
    </div>
  );
}

// ─── Copy button ──────────────────────────────────────────────────────────────
function CopyBtn({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const [hov, setHov] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title="Copy JSON"
      style={{
        display: "flex", alignItems: "center", gap: 5,
        background: hov ? T.bgHover : "transparent",
        border: `1px solid ${hov ? T.borderInner : "transparent"}`,
        borderRadius: 5, padding: "3px 9px",
        fontFamily: "'Menlo','Monaco','Consolas','Courier New',monospace",
        fontSize: 11,
        color: copied ? T.string : T.gutterFg,
        cursor: "pointer", transition: "all 0.13s",
        whiteSpace: "nowrap",
      }}
    >
      {copied ? (
        <><svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1.5 5.5L4 8L9.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>Copied</>
      ) : (
        <><svg width="11" height="11" viewBox="0 0 11 11" fill="none"><rect x="3.5" y="3.5" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.2"/><path d="M2 7.5H1.5A1 1 0 0 1 .5 6.5v-5A1 1 0 0 1 1.5.5h5A1 1 0 0 1 7.5 1.5V2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>Copy</>
      )}
    </button>
  );
}

// ─── Mode toggle button (Edit / Tree) ────────────────────────────────────────
function ModeBtn({ rawMode, onClick }: { rawMode: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title={rawMode ? "Switch to tree view" : "Edit raw JSON"}
      style={{
        display: "flex", alignItems: "center", gap: 5,
        background: hov ? T.bgHover : "transparent",
        border: `1px solid ${hov ? T.borderInner : "transparent"}`,
        borderRadius: 5, padding: "3px 9px",
        fontFamily: "'Menlo','Monaco','Consolas','Courier New',monospace",
        fontSize: 11,
        color: rawMode ? T.string : T.gutterFg,
        cursor: "pointer", transition: "all 0.13s",
        whiteSpace: "nowrap",
      }}
    >
      {rawMode ? (
        <>
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M1 2.5h3M1 5.5h5M1 8.5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            <circle cx="9" cy="2.5" r="1.3" stroke="currentColor" strokeWidth="1.1"/>
            <circle cx="9" cy="8.5" r="1.3" stroke="currentColor" strokeWidth="1.1"/>
            <path d="M4 2.5h3.5M5.5 5.5H7V4M7.7 8.5H5.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
          </svg>
          Tree
        </>
      ) : (
        <>
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M8 2l1.5 1.5-5.5 5.5H2.5V7.5L8 2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
          </svg>
          Edit
        </>
      )}
    </button>
  );
}

// ─── Small action button ──────────────────────────────────────────────────────
function ActionBtn({ onClick, label, primary, disabled }: {
  onClick: () => void; label: string; primary?: boolean; disabled?: boolean;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600,
        padding: "4px 12px", borderRadius: 6,
        border: primary ? "none" : `1px solid ${T.borderInner}`,
        background: primary
          ? (disabled ? "#1A3A5C" : hov ? "#4FA8E0" : T.statusAccent)
          : (hov ? T.bgHover : "transparent"),
        color: primary ? "#fff" : (hov ? T.text : T.gutterFg),
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1, transition: "all 0.13s",
      }}
    >
      {label}
    </button>
  );
}

// ─── Toggle icon button ───────────────────────────────────────────────────────
function IconBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick} title={title}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 26, height: 26, borderRadius: 5,
        background: hov ? T.bgHover : "transparent",
        border: `1px solid ${hov ? T.borderInner : "transparent"}`,
        color: hov ? T.text : T.gutterFg,
        cursor: "pointer", transition: "all 0.13s",
      }}
    >
      {children}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface DslEditorProps {
  dsl: DSL;
  onChange: (dsl: DSL) => void;
  readOnly?: boolean;
}

export default function DslEditor({ dsl, onChange, readOnly }: DslEditorProps) {
  const apiDsl = dslToApi(dsl);
  const jsonStr = useMemo(() => JSON.stringify(apiDsl, null, 2), [apiDsl]);

  const [rawMode, setRawMode] = useState(false);
  const [rawText, setRawText] = useState(jsonStr);
  const [parseError, setParseError] = useState<string | null>(null);

  const prevJsonStr = useRef(jsonStr);
  useEffect(() => {
    if (!rawMode && jsonStr !== prevJsonStr.current) {
      setRawText(jsonStr);
      prevJsonStr.current = jsonStr;
    }
  }, [jsonStr, rawMode]);

  const handleRawChange = (text: string) => {
    setRawText(text);
    setParseError(null);
    try {
      const parsed = JSON.parse(text);
      const updated = apiToDsl(parsed as ApiDSL);
      onChange(updated);
      prevJsonStr.current = JSON.stringify(dslToApi(updated), null, 2);
    } catch (e) {
      setParseError((e as Error).message);
    }
  };

  const handleRawCommit = () => {
    try {
      const parsed = JSON.parse(rawText);
      const updated = apiToDsl(parsed as ApiDSL);
      onChange(updated);
      setParseError(null);
      setRawMode(false);
    } catch (e) {
      setParseError((e as Error).message);
    }
  };

  const switchToRaw = () => { setRawText(jsonStr); setParseError(null); setRawMode(true); };
  const lineCount = (rawMode ? rawText : jsonStr).split("\n").length;
  const charCount = (rawMode ? rawText : jsonStr).length;

  return (
    <div style={shellStyle}>

      {/* ── Tab bar ── */}
      <div style={tabBarStyle}>
        {/* Active tab */}
        <div style={tabStyle}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
            <rect x="1" y="1" width="10" height="10" rx="1.5" stroke={T.key} strokeWidth="1.2" opacity="0.8"/>
            <path d="M3 4h6M3 6h4M3 8h5" stroke={T.key} strokeWidth="1" strokeLinecap="round" opacity="0.8"/>
          </svg>
          <span style={{ letterSpacing: "-0.01em" }}>dsl.json</span>
          {!readOnly && rawMode && parseError && (
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: T.error, flexShrink: 0 }} />
          )}
        </div>

        <div style={{ flex: 1 }} />

        {/* Toolbar buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, paddingRight: 10 }}>
          <CopyBtn code={jsonStr} />
          {!readOnly && (
            <ModeBtn
              rawMode={rawMode}
              onClick={rawMode ? () => { setRawMode(false); setParseError(null); } : switchToRaw}
            />
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={bodyStyle}>
        {rawMode && !readOnly ? (
          <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, overflow: "auto" }}>
              <RawEditor value={rawText} onChange={handleRawChange} />
            </div>
            {/* Error bar */}
            {parseError && (
              <div style={{
                padding: "5px 16px", background: T.errorBg,
                borderTop: `1px solid ${T.error}30`,
                color: T.error, fontSize: 11,
                fontFamily: "'Menlo','Monaco','Consolas','Courier New',monospace",
                display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
              }}>
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M5.5 3v2.5M5.5 7.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                {parseError}
              </div>
            )}
            {/* Action bar */}
            <div style={rawActionBarStyle}>
              <span style={{ fontSize: 10, color: parseError ? T.error : T.string, fontFamily: "var(--font-sans)", fontWeight: 600 }}>
                {parseError ? "⚠ Invalid JSON" : "✓ Valid JSON"}
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <ActionBtn onClick={() => { setRawMode(false); setParseError(null); }} label="Cancel" />
                <ActionBtn onClick={handleRawCommit} label="Apply" primary disabled={!!parseError} />
              </div>
            </div>
          </div>
        ) : (
          <div style={{ overflowY: "auto", overflowX: "auto", height: "100%", paddingTop: 10, paddingBottom: 10 }}>
            <JsonViewer value={apiDsl as unknown as JsonValue} />
          </div>
        )}
      </div>

      {/* ── Status bar ── */}
      <div style={statusBarStyle}>
        <span style={statusDotStyle} />
        <span>JSON</span>
        <span style={{ color: T.borderInner }}>·</span>
        <span>{lineCount} lines</span>
        <span style={{ color: T.borderInner }}>·</span>
        <span>{charCount} chars</span>
        <div style={{ flex: 1 }} />
        {!readOnly && (
          <span style={{ color: T.statusAccent, fontWeight: 600 }}>
            {rawMode ? "Raw" : "Tree"}
          </span>
        )}
        {readOnly && <span style={{ color: T.gutterFg }}>read-only</span>}
      </div>

    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const shellStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  background: T.bg,
  borderRadius: 12,
  overflow: "hidden",
  border: `1px solid ${T.border}`,
  boxShadow: "0 4px 24px rgba(0,0,0,0.28), 0 1px 4px rgba(0,0,0,0.2)",
  fontFamily: "'Menlo','Monaco','Consolas','Courier New',monospace",
};

const tabBarStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  background: T.tabBar,
  borderBottom: `1px solid ${T.gutterBorder}`,
  height: 36,
  flexShrink: 0,
  borderRadius: "12px 12px 0 0",
};

const tabStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  height: "100%",
  padding: "0 16px",
  background: T.tabActiveBg,
  borderTop: `2px solid ${T.tabAccent}`,
  borderRight: `1px solid ${T.gutterBorder}`,
  fontSize: 12,
  color: T.tabFg,
  userSelect: "none",
  flexShrink: 0,
  borderRadius: "10px 0 0 0",
};

const bodyStyle: CSSProperties = {
  flex: 1,
  overflow: "hidden",
  position: "relative",
};

const rawActionBarStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "7px 14px",
  background: T.bgAlt,
  borderTop: `1px solid ${T.gutterBorder}`,
  flexShrink: 0,
};

const statusBarStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  height: 24,
  background: T.statusBg,
  color: T.statusFg,
  fontSize: 10.5,
  padding: "0 14px",
  flexShrink: 0,
  fontFamily: "var(--font-sans)",
  userSelect: "none",
  borderTop: `1px solid ${T.gutterBorder}`,
  borderRadius: "0 0 12px 12px",
  letterSpacing: "0.01em",
};

const statusDotStyle: CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: "50%",
  background: T.statusAccent,
  flexShrink: 0,
};

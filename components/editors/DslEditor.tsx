"use client";

import { useState, useCallback, CSSProperties, useRef, useEffect } from "react";
import type { DSL, ApiDSL } from "@/lib/types";
import { dslToApi, apiToDsl } from "@/lib/types";
import Button from "@/components/ui/Button";

// ─── Colours (dark theme matching CodeBlock) ─────────────────────────────────
const C = {
  bg: "var(--ink)",
  text: "#E5E5E3",
  key: "#93C5FD",
  string: "#FCA5A5",
  number: "#FCD34D",
  boolean: "#C4B5FD",
  null: "#C4B5FD",
  bracket: "#9CA3AF",
  toggle: "#6B7280",
  toggleHover: "#D1D5DB",
  error: "#F87171",
  success: "#4ADE80",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
type JsonObject = { [key: string]: JsonValue };
type JsonArray = JsonValue[];

interface JsonNodeProps {
  value: JsonValue;
  /** undefined = root, string = object key, number = array index */
  keyName?: string | number;
  depth: number;
  isLast: boolean;
  onChange: (newVal: JsonValue) => void;
}

// ─── Leaf editor ──────────────────────────────────────────────────────────────

function LeafEditor({
  raw,
  onCommit,
  onCancel,
}: {
  raw: string;
  onCommit: (v: JsonValue) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(raw);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const commit = () => {
    try {
      onCommit(JSON.parse(text));
    } catch {
      // treat as string literal
      onCommit(text);
    }
  };

  return (
    <input
      ref={ref}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") onCancel();
      }}
      style={leafInputStyle}
    />
  );
}

// ─── Leaf value display ───────────────────────────────────────────────────────

function LeafDisplay({ value }: { value: JsonValue }) {
  if (value === null) return <span style={{ color: C.null }}>null</span>;
  if (typeof value === "boolean") return <span style={{ color: C.boolean }}>{String(value)}</span>;
  if (typeof value === "number") return <span style={{ color: C.number }}>{value}</span>;
  if (typeof value === "string") return <span style={{ color: C.string }}>"{value}"</span>;
  return null;
}

// ─── JsonNode ─────────────────────────────────────────────────────────────────

function JsonNode({ value, keyName, depth, isLast, onChange }: JsonNodeProps) {
  const [open, setOpen] = useState(depth < 2);
  const [editing, setEditing] = useState(false);
  const [hovered, setHovered] = useState(false);

  const isObject = value !== null && typeof value === "object" && !Array.isArray(value);
  const isArray = Array.isArray(value);
  const isLeaf = !isObject && !isArray;

  const indent = depth * 16;
  const openBracket = isArray ? "[" : "{";
  const closeBracket = isArray ? "]" : "}";
  const entries = isObject
    ? Object.entries(value as JsonObject)
    : isArray
    ? (value as JsonArray).map((v, i) => [i, v] as [number, JsonValue])
    : [];
  const count = entries.length;

  const handleChildChange = useCallback(
    (childKey: string | number, newChild: JsonValue) => {
      if (isObject) {
        onChange({ ...(value as JsonObject), [childKey as string]: newChild });
      } else if (isArray) {
        const copy = [...(value as JsonArray)];
        copy[childKey as number] = newChild;
        onChange(copy);
      }
    },
    [value, isObject, isArray, onChange]
  );

  const rowStyle: CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    paddingLeft: indent,
    paddingRight: 8,
    minHeight: 22,
    background: hovered && isLeaf ? "rgba(255,255,255,0.04)" : "transparent",
    borderRadius: 4,
    cursor: isLeaf ? "text" : "default",
    userSelect: "none",
  };

  const keyLabel = keyName !== undefined ? (
    <span style={{ color: C.key, marginRight: 4 }}>
      {typeof keyName === "string" ? `"${keyName}"` : keyName}
      <span style={{ color: C.text }}>: </span>
    </span>
  ) : null;

  const trailing = isLast ? "" : ",";

  // ── Collapsed node ────────────────────────────────────────────────────────
  if (!isLeaf && !open) {
    return (
      <div
        style={rowStyle}
        onClick={() => setOpen(true)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <ToggleBtn open={false} onClick={() => setOpen(true)} />
        {keyLabel}
        <span style={{ color: C.bracket }}>
          {openBracket}
          <span style={{ color: C.toggle, fontSize: 11, margin: "0 4px" }}>
            {count} {count === 1 ? "item" : "items"}
          </span>
          {closeBracket}
        </span>
        <span style={{ color: C.bracket }}>{trailing}</span>
      </div>
    );
  }

  // ── Expanded node ─────────────────────────────────────────────────────────
  if (!isLeaf) {
    return (
      <div>
        <div
          style={{ ...rowStyle, cursor: "default" }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <ToggleBtn open={true} onClick={() => setOpen(false)} />
          {keyLabel}
          <span style={{ color: C.bracket }}>{openBracket}</span>
        </div>
        {(entries as [string | number, JsonValue][]).map(([k, v], i) => (
          <JsonNode
            key={String(k)}
            keyName={k}
            value={v}
            depth={depth + 1}
            isLast={i === entries.length - 1}
            onChange={(newV) => handleChildChange(k, newV)}
          />
        ))}
        <div style={{ paddingLeft: indent, color: C.bracket, minHeight: 22, display: "flex", alignItems: "center" }}>
          {closeBracket}
          <span style={{ color: C.bracket }}>{trailing}</span>
        </div>
      </div>
    );
  }

  // ── Leaf ──────────────────────────────────────────────────────────────────
  const rawForEdit =
    typeof value === "string" ? value : JSON.stringify(value);

  return (
    <div
      style={rowStyle}
      onClick={() => !editing && setEditing(true)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span style={{ width: 16, flexShrink: 0 }} />
      {keyLabel}
      {editing ? (
        <LeafEditor
          raw={rawForEdit}
          onCommit={(v) => { setEditing(false); onChange(v); }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <LeafDisplay value={value} />
      )}
      <span style={{ color: C.bracket }}>{trailing}</span>
    </div>
  );
}

// ─── Toggle button ────────────────────────────────────────────────────────────

function ToggleBtn({ open, onClick }: { open: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <span
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 16,
        height: 16,
        flexShrink: 0,
        color: hovered ? C.toggleHover : C.toggle,
        cursor: "pointer",
        fontSize: 10,
        marginRight: 0,
        transform: open ? "rotate(90deg)" : "rotate(0deg)",
        transition: "transform 0.15s, color 0.15s",
        userSelect: "none",
      }}
    >
      ▶
    </span>
  );
}

// ─── Raw text fallback editor ─────────────────────────────────────────────────

function RawEditor({
  value,
  onCommit,
  onCancel,
}: {
  value: string;
  onCommit: (v: JsonValue) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(value);
  const [err, setErr] = useState<string | null>(null);

  const commit = () => {
    try {
      onCommit(JSON.parse(text));
      setErr(null);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <div style={{ padding: "0 16px 16px" }}>
      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setErr(null); }}
        style={rawTextareaStyle}
        rows={24}
        spellCheck={false}
      />
      {err && <div style={{ color: C.error, fontSize: 11, marginTop: 4 }}>{err}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <Button variant="ghost" size="md" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" size="md" onClick={commit}>Apply</Button>
      </div>
    </div>
  );
}

// ─── Main DslEditor ───────────────────────────────────────────────────────────

interface DslEditorProps {
  dsl: DSL;
  onChange: (dsl: DSL) => void;
  readOnly?: boolean;
}

export default function DslEditor({ dsl, onChange, readOnly }: DslEditorProps) {
  const apiDsl = dslToApi(dsl);
  const [rawMode, setRawMode] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleTreeChange = useCallback(
    (newVal: JsonValue) => {
      try {
        const updated = apiToDsl(newVal as unknown as ApiDSL);
        setParseError(null);
        onChange(updated);
      } catch (e) {
        setParseError((e as Error).message);
      }
    },
    [onChange]
  );

  const handleRawCommit = useCallback(
    (parsed: JsonValue) => {
      try {
        const updated = apiToDsl(parsed as unknown as ApiDSL);
        setParseError(null);
        onChange(updated);
        setRawMode(false);
      } catch (e) {
        setParseError((e as Error).message);
      }
    },
    [onChange]
  );

  return (
    <div style={wrapperStyle}>
      {/* Toolbar */}
      <div style={toolbarStyle}>
        <span style={{ fontSize: 11, color: C.toggle, fontFamily: "var(--font-nunito)" }}>
          {readOnly ? "Read-only" : "Click a value to edit"}
        </span>
        {!readOnly && (
          <button
            style={rawToggleStyle}
            onClick={() => { setRawMode((v) => !v); setParseError(null); }}
          >
            {rawMode ? "Tree view" : "Raw JSON"}
          </button>
        )}
      </div>

      {/* Parse error banner */}
      {parseError && (
        <div style={{ padding: "6px 16px", background: "rgba(248,113,113,0.1)", color: C.error, fontSize: 11, fontFamily: "var(--font-nunito)" }}>
          {parseError}
        </div>
      )}

      {/* Content */}
      {rawMode ? (
        <RawEditor
          value={JSON.stringify(apiDsl, null, 2)}
          onCommit={handleRawCommit}
          onCancel={() => setRawMode(false)}
        />
      ) : (
        <div style={treeStyle}>
          <JsonNode
            value={apiDsl as unknown as JsonValue}
            depth={0}
            isLast={true}
            onChange={readOnly ? () => {} : handleTreeChange}
          />
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const wrapperStyle: CSSProperties = {
  background: C.bg,
  borderRadius: 10,
  overflow: "hidden",
  fontFamily: "var(--font-nunito)",
  fontSize: 12,
  lineHeight: "22px",
  color: C.text,
};

const toolbarStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "8px 16px",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
};

const rawToggleStyle: CSSProperties = {
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 6,
  padding: "3px 10px",
  fontFamily: "var(--font-nunito)",
  fontSize: 11,
  color: "rgba(255,255,255,0.6)",
  cursor: "pointer",
};

const treeStyle: CSSProperties = {
  padding: "12px 8px",
  overflowX: "auto",
};

const leafInputStyle: CSSProperties = {
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: 4,
  color: C.text,
  fontFamily: "var(--font-nunito)",
  fontSize: 12,
  padding: "0 6px",
  height: 20,
  outline: "none",
  minWidth: 80,
};

const rawTextareaStyle: CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 6,
  color: C.text,
  fontFamily: "var(--font-nunito)",
  fontSize: 12,
  lineHeight: 1.6,
  padding: 12,
  outline: "none",
  resize: "vertical",
  boxSizing: "border-box",
};

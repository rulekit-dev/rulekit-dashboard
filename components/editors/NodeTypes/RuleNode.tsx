"use client";

import React, { CSSProperties, useState, useRef, useEffect } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { RuleNode as RuleNodeType } from "@/lib/types";

interface RuleNodeData {
  node: RuleNodeType;
  onEditTable?: (id: string) => void;
  onRename?: (id: string, name: string) => void;
  simulationPhase?: "active" | "matched" | "unmatched" | "done-matched" | "done-unmatched";
  [key: string]: unknown;
}

export default function RuleNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as RuleNodeData;
  const { node, onEditTable, onRename, simulationPhase } = nodeData;
  const rowCount = node.rows?.length ?? 0;
  const inputCols = node.inputColumns ?? [];
  const outputCols = node.outputColumns ?? [];
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.name);
  const [titleHovered, setTitleHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commitRename = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== node.name) {
      onRename?.(node.id, trimmed);
    } else {
      setEditValue(node.name);
    }
    setEditing(false);
  };

  const simBorderColor = simulationPhase === "active"
    ? "var(--orange)"
    : simulationPhase === "matched" || simulationPhase === "done-matched"
    ? "var(--green)"
    : simulationPhase === "unmatched" || simulationPhase === "done-unmatched"
    ? "var(--border-med)"
    : selected ? "var(--orange)" : "var(--border-med)";

  const simBoxShadow = simulationPhase === "active"
    ? "0 0 0 3px var(--orange-dim), 0 0 16px rgba(240,90,40,0.3)"
    : simulationPhase === "matched"
    ? "0 0 0 3px var(--green-dim), 0 0 12px rgba(34,197,94,0.25)"
    : simulationPhase === "done-matched"
    ? "0 0 0 2px var(--green-dim)"
    : simulationPhase === "done-unmatched" || simulationPhase === "unmatched"
    ? "0 1px 5px rgba(28,28,26,0.07)"
    : selected
    ? "0 0 0 3px var(--orange-dim)"
    : "0 1px 5px rgba(28,28,26,0.07)";

  const cardStyle: CSSProperties = {
    background: simulationPhase === "unmatched" || simulationPhase === "done-unmatched"
      ? "var(--surface)"
      : "white",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: simBorderColor,
    borderRadius: 10,
    boxShadow: simBoxShadow,
    minWidth: 180,
    cursor: "pointer",
    opacity: simulationPhase === "unmatched" || simulationPhase === "done-unmatched" ? 0.55 : 1,
    transition: "box-shadow 0.3s ease, border-color 0.3s ease, opacity 0.3s ease",
  };

  const simBadge = simulationPhase === "active" ? (
    <span style={{ ...simBadgeBase, background: "var(--orange-dim)", color: "var(--orange)" }}>●</span>
  ) : simulationPhase === "matched" || simulationPhase === "done-matched" ? (
    <span style={{ ...simBadgeBase, background: "var(--green-dim)", color: "var(--green-deep)" }}>✓</span>
  ) : simulationPhase === "unmatched" || simulationPhase === "done-unmatched" ? (
    <span style={{ ...simBadgeBase, background: "var(--surface)", color: "var(--ink-subtle)" }}>—</span>
  ) : null;

  return (
    <div style={cardStyle}>
      <Handle type="target" position={Position.Left} style={leftHandleStyle} />
      <div style={headerStyle}>
        <div style={iconStyle}>R</div>
        {editing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") { setEditValue(node.name); setEditing(false); }
            }}
            style={titleInputStyle}
          />
        ) : (
          <div
            style={{
              ...titleStyle,
              background: titleHovered ? "var(--surface)" : "transparent",
              borderRadius: 4,
              padding: "1px 4px",
              margin: "-1px -4px",
            }}
            onMouseEnter={() => setTitleHovered(true)}
            onMouseLeave={() => setTitleHovered(false)}
            onClick={(e) => { e.stopPropagation(); setEditValue(node.name); setEditing(true); }}
          >
            {node.name || "Untitled"}
            {titleHovered && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ marginLeft: 4, flexShrink: 0, opacity: 0.5 }}>
                <path d="M7.5 1.5L8.5 2.5L3.5 7.5H2.5V6.5L7.5 1.5Z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        )}
        {simBadge}
      </div>
      <div style={bodyStyle}>
        <div style={summaryRowStyle}>
          <span style={{ color: "var(--ink-muted)" }}>{rowCount} row{rowCount !== 1 ? "s" : ""}</span>
        </div>
        {inputCols.length > 0 && (
          <div style={summaryRowStyle}>
            <span style={{ color: "var(--ink-subtle)", fontSize: 9 }}>IN:</span>
            <span style={{ color: "var(--ink)" }}>{inputCols.join(", ")}</span>
          </div>
        )}
        {outputCols.length > 0 && (
          <>
            <div style={separatorStyle} />
            <div style={summaryRowStyle}>
              <span style={{ color: "var(--ink-subtle)", fontSize: 9 }}>OUT:</span>
              <span style={{ color: "var(--green-deep)" }}>{outputCols.join(", ")}</span>
            </div>
          </>
        )}
      </div>
      <div style={footerStyle}>
        <button
          style={editRuleBtnStyle}
          onClick={(e) => {
            e.stopPropagation();
            onEditTable?.(node.id);
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--orange-deep)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--orange)"; }}
        >
          Edit Rule
        </button>
      </div>
      <Handle type="source" position={Position.Right} style={rightHandleStyle} />
    </div>
  );
}

const headerStyle: CSSProperties = {
  borderBottom: "1px solid var(--border)",
  padding: "7px 10px",
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
};

const iconStyle: CSSProperties = {
  width: 20,
  height: 20,
  borderRadius: "50%",
  background: "var(--orange-dim)",
  color: "var(--orange)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 10,
  fontFamily: "var(--font-nunito)",
  fontWeight: 700,
  flexShrink: 0,
};

const titleStyle: CSSProperties = {
  fontWeight: 700,
  fontSize: 11,
  color: "var(--ink)",
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  transition: "background 0.12s",
};

const titleInputStyle: CSSProperties = {
  fontWeight: 700,
  fontSize: 11,
  color: "var(--ink)",
  flex: 1,
  border: "1px solid var(--border-med)",
  borderRadius: 4,
  padding: "1px 4px",
  outline: "none",
  background: "var(--surface)",
  fontFamily: "inherit",
  minWidth: 0,
};

const bodyStyle: CSSProperties = {
  padding: "6px 10px 8px",
};

const summaryRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  padding: "2px 0",
  fontFamily: "var(--font-nunito)",
  fontSize: 10,
};

const separatorStyle: CSSProperties = {
  borderTop: "1px solid var(--border)",
  margin: "4px 0",
};

const leftHandleStyle: CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: "50%",
  background: "white",
  border: "2px solid var(--orange)",
  cursor: "crosshair",
};

const rightHandleStyle: CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: "50%",
  background: "white",
  border: "2px solid var(--green)",
  cursor: "crosshair",
};

const footerStyle: CSSProperties = {
  padding: "6px 8px",
};

const editRuleBtnStyle: CSSProperties = {
  width: "100%",
  background: "var(--orange)",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontFamily: "var(--font-nunito)",
  fontSize: 10,
  fontWeight: 600,
  color: "white",
  padding: "5px 8px",
  letterSpacing: "0.02em",
  transition: "background 0.15s",
};

const simBadgeBase: CSSProperties = {
  fontFamily: "var(--font-nunito)",
  fontSize: 10,
  fontWeight: 700,
  borderRadius: 4,
  padding: "1px 5px",
  flexShrink: 0,
  marginLeft: "auto",
};

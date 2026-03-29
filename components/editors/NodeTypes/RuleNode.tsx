"use client";

import React, { CSSProperties } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { RuleNode as RuleNodeType } from "@/lib/types";

interface RuleNodeData {
  node: RuleNodeType;
  onEditTable?: (id: string) => void;
  [key: string]: unknown;
}

export default function RuleNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as RuleNodeData;
  const { node, onEditTable } = nodeData;
  const rowCount = node.rows?.length ?? 0;
  const inputCols = node.inputColumns ?? [];
  const outputCols = node.outputColumns ?? [];
  const schemaCount = Object.keys(node.schema).length;

  const cardStyle: CSSProperties = {
    background: "white",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: selected ? "var(--orange)" : "var(--border-med)",
    borderRadius: 10,
    boxShadow: selected
      ? "0 0 0 3px var(--orange-dim)"
      : "0 1px 5px rgba(28,28,26,0.07)",
    minWidth: 180,
    cursor: "pointer",
  };

  return (
    <div style={cardStyle}>
      <Handle type="target" position={Position.Left} style={leftHandleStyle} />
      <div style={headerStyle}>
        <div style={iconStyle}>R</div>
        <div style={titleStyle}>{node.name || "Untitled"}</div>
        <div style={tagStyle}>{node.strategy === "all_matches" ? "ALL" : "FIRST"}</div>
      </div>
      <div style={bodyStyle}>
        <div style={summaryRowStyle}>
          <span style={{ color: "var(--ink-muted)" }}>{schemaCount} field{schemaCount !== 1 ? "s" : ""} · {rowCount} row{rowCount !== 1 ? "s" : ""}</span>
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
};

const tagStyle: CSSProperties = {
  fontFamily: "var(--font-nunito)",
  fontSize: 9,
  textTransform: "uppercase",
  color: "var(--ink-subtle)",
  letterSpacing: "0.05em",
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

"use client";

import React, { CSSProperties } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
interface OutputNodeData {
  defaultOutput?: Record<string, unknown>;
  [key: string]: unknown;
}

export default function OutputNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as OutputNodeData;
  const defaultEntries = Object.entries(nodeData.defaultOutput || {});

  const cardStyle: CSSProperties = {
    background: "white",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: selected ? "var(--green)" : "var(--border-med)",
    borderRadius: 10,
    boxShadow: selected
      ? "0 0 0 3px var(--green-dim)"
      : "0 1px 5px rgba(28,28,26,0.07)",
    minWidth: 180,
  };

  return (
    <div style={cardStyle}>
      <Handle type="target" position={Position.Left} style={handleStyle} />
      <div style={headerStyle}>
        <div style={iconStyle}>O</div>
        <div style={titleStyle}>Output</div>
        <div style={tagStyle}>OUTPUT</div>
      </div>
      <div style={bodyStyle}>
        {defaultEntries.length === 0 ? (
          <div style={emptyStyle}>No default output</div>
        ) : (
          defaultEntries.map(([key, val]) => (
            <div key={key} style={outputRowStyle}>
              <span style={{ color: "var(--ink-muted)" }}>{key}</span>
              <span style={{ color: "var(--ink-subtle)" }}>=</span>
              <span style={{ color: "var(--green-deep)" }}>{String(val)}</span>
            </div>
          ))
        )}
      </div>
      <div style={footerStyle}>
        <span style={footerTextStyle}>Default</span>
      </div>
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
  background: "var(--green-dim)",
  color: "var(--green)",
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

const emptyStyle: CSSProperties = {
  fontFamily: "var(--font-nunito)",
  fontSize: 10,
  fontStyle: "italic",
  color: "var(--ink-subtle)",
  padding: "2px 0",
};

const outputRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  padding: "2px 0",
  fontFamily: "var(--font-nunito)",
  fontSize: 10,
};

const footerStyle: CSSProperties = {
  borderTop: "1px solid var(--border)",
  padding: "4px 10px",
  display: "flex",
  justifyContent: "flex-end",
};

const footerTextStyle: CSSProperties = {
  fontFamily: "var(--font-nunito)",
  fontSize: 9,
  color: "var(--ink-subtle)",
  letterSpacing: "0.02em",
};

const handleStyle: CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: "50%",
  background: "white",
  borderWidth: "2px",
  borderStyle: "solid",
  borderColor: "var(--green)",
  cursor: "crosshair",
};

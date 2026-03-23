"use client";

import React, { CSSProperties } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

interface InputNodeData {
  schema: Record<string, { type: string }>;
  [key: string]: unknown;
}

const TYPE_COLORS: Record<string, string> = {
  number: "#2563EB",
  string: "#7C3AED",
  boolean: "#D97706",
  enum: "#16A34A",
};

export default function InputNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as InputNodeData;
  const fields = Object.entries(nodeData.schema || {});

  const cardStyle: CSSProperties = {
    background: "white",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: selected ? "var(--blue)" : "var(--border-med)",
    borderRadius: 10,
    boxShadow: selected
      ? "0 0 0 3px var(--blue-dim)"
      : "0 1px 5px rgba(28,28,26,0.07)",
    minWidth: 180,
  };

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <div style={iconStyle}>I</div>
        <div style={titleStyle}>Input</div>
        <div style={tagStyle}>INPUT</div>
      </div>
      <div style={bodyStyle}>
        {fields.length === 0 ? (
          <div style={emptyStyle}>No fields defined</div>
        ) : (
          fields.map(([name, def]) => (
            <div key={name} style={fieldRowStyle}>
              <span style={{ ...dotStyle, background: TYPE_COLORS[def.type] || "#999" }} />
              <span style={fieldNameStyle}>{name}</span>
              <span style={fieldTypeStyle}>{def.type}</span>
            </div>
          ))
        )}
      </div>
      <div style={footerStyle}>
        <span style={footerTextStyle}>{fields.length} field{fields.length !== 1 ? "s" : ""}</span>
      </div>
      <Handle type="source" position={Position.Right} style={handleStyle} />
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
  background: "var(--blue-dim)",
  color: "var(--blue)",
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

const fieldRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "2px 0",
};

const dotStyle: CSSProperties = {
  width: 5,
  height: 5,
  borderRadius: "50%",
  flexShrink: 0,
};

const fieldNameStyle: CSSProperties = {
  fontFamily: "var(--font-nunito)",
  fontSize: 10,
  color: "var(--ink-muted)",
  flex: 1,
};

const fieldTypeStyle: CSSProperties = {
  fontFamily: "var(--font-nunito)",
  fontSize: 9,
  color: "var(--ink-subtle)",
};

const emptyStyle: CSSProperties = {
  fontFamily: "var(--font-nunito)",
  fontSize: 10,
  fontStyle: "italic",
  color: "var(--ink-subtle)",
  padding: "2px 0",
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
  borderColor: "var(--blue)",
  cursor: "crosshair",
};

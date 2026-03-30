"use client";

import React, { CSSProperties } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

export default function InputNode({ selected }: NodeProps) {
  const cardStyle: CSSProperties = {
    background: "white",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: selected ? "var(--blue)" : "var(--border-med)",
    borderRadius: 10,
    boxShadow: selected
      ? "0 0 0 3px var(--blue-dim)"
      : "0 1px 5px rgba(28,28,26,0.07)",
    minWidth: 120,
  };

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <div style={iconStyle}>I</div>
        <div style={titleStyle}>Input</div>
      </div>
      <div style={bodyStyle} />
      <div style={footerStyle}>
        <span style={footerTextStyle}>Schema input</span>
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
};

const bodyStyle: CSSProperties = {
  padding: "6px 10px 8px",
};

const footerStyle: CSSProperties = {
  padding: "6px 8px",
};

const footerTextStyle: CSSProperties = {
  fontFamily: "var(--font-nunito)",
  fontSize: 10,
  color: "var(--ink-muted)",
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

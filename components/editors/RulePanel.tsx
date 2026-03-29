"use client";

import React, { CSSProperties } from "react";
import type { RuleNode } from "@/lib/types";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

interface RulePanelProps {
  rule: RuleNode | null;
  schema: Record<string, { type: string }>;
  onChange: (rule: RuleNode) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  onEditTable?: (id: string) => void;
}

export default function RulePanel({ rule, onChange, onDelete, onClose, onEditTable }: RulePanelProps) {
  if (!rule) return null;

  function updateName(e: React.ChangeEvent<HTMLInputElement>) {
    onChange({ ...rule!, name: e.target.value });
  }

  const rowCount = rule.rows?.length ?? 0;

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <div style={headerTitleStyle}>Edit Rule</div>
        <button style={closeButtonStyle} onClick={onClose}>
          &#x2715;
        </button>
      </div>

      <Input label="Rule name" value={rule.name} onChange={updateName} />

      <div style={sectionLabelStyle}>Decision Table</div>
      <div style={summaryStyle}>
        <span>{rowCount} row{rowCount !== 1 ? "s" : ""}</span>
        {rule.inputColumns.length > 0 && (
          <span> &middot; {rule.inputColumns.length} input{rule.inputColumns.length !== 1 ? "s" : ""}</span>
        )}
        {rule.outputColumns.length > 0 && (
          <span> &middot; {rule.outputColumns.length} output{rule.outputColumns.length !== 1 ? "s" : ""}</span>
        )}
      </div>
      {onEditTable && (
        <button style={editTableLinkStyle} onClick={() => onEditTable(rule.id)}>
          Open table editor
        </button>
      )}

      <div style={{ marginTop: 24 }}>
        <Button variant="danger" size="sm" onClick={() => onDelete(rule.id)} style={{ width: "100%" }}>
          Delete rule
        </Button>
      </div>
    </div>
  );
}

const panelStyle: CSSProperties = {
  position: "absolute",
  right: 0,
  top: 0,
  bottom: 0,
  width: 300,
  background: "white",
  borderLeft: "1px solid var(--border)",
  boxShadow: "-4px 0 12px rgba(28,28,26,0.06)",
  zIndex: 10,
  padding: 20,
  overflowY: "auto",
  boxSizing: "border-box",
};

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 16,
};

const headerTitleStyle: CSSProperties = {
  fontWeight: 700,
  fontSize: 16,
  color: "var(--ink)",
};

const closeButtonStyle: CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: 18,
  color: "var(--ink-muted)",
  padding: 4,
  lineHeight: 1,
};

const sectionLabelStyle: CSSProperties = {
  fontFamily: "var(--font-nunito)",
  fontSize: 10,
  textTransform: "uppercase",
  color: "var(--ink-subtle)",
  letterSpacing: "0.06em",
  marginTop: 16,
  marginBottom: 8,
};

const summaryStyle: CSSProperties = {
  fontFamily: "var(--font-nunito)",
  fontSize: 12,
  color: "var(--ink-muted)",
};

const editTableLinkStyle: CSSProperties = {
  fontFamily: "var(--font-nunito)",
  fontSize: 12,
  color: "var(--orange)",
  cursor: "pointer",
  marginTop: 8,
  background: "none",
  border: "none",
  padding: 0,
};

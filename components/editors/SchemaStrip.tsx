"use client";

import React, { useState, CSSProperties } from "react";
import Button from "@/components/ui/Button";
import type { SchemaField } from "@/lib/types";

interface SchemaStripProps {
  schema: Record<string, SchemaField>;
  onChange: (schema: Record<string, SchemaField>) => void;
  readOnly?: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  number: "#2563EB",
  string: "#7C3AED",
  boolean: "#D97706",
  enum: "#16A34A",
};

export default function SchemaStrip({ schema, onChange, readOnly = false }: SchemaStripProps) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<string>("string");
  const [nameError, setNameError] = useState(false);

  const stripStyle: CSSProperties = {
    background: "var(--surface-2)",
    borderBottom: "1px solid var(--border)",
    padding: "8px 14px",
    display: "flex",
    flexDirection: "row",
    gap: "8px",
    flexWrap: "wrap",
    alignItems: "center",
  };

  const pillStyle: CSSProperties = {
    background: "var(--white)",
    border: "1px solid var(--border-med)",
    borderRadius: "20px",
    padding: "4px 10px",
    display: "inline-flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "6px",
  };

  const dotStyle = (type: string): CSSProperties => ({
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: TYPE_COLORS[type] || "#999",
    flexShrink: 0,
  });

  const fieldNameStyle: CSSProperties = {
    fontFamily: "var(--font-nunito)",
    fontWeight: 500,
    fontSize: "10px",
    color: "var(--ink)",
  };

  const typeLabelStyle: CSSProperties = {
    fontFamily: "var(--font-nunito)",
    fontWeight: 400,
    fontSize: "10px",
    color: "var(--ink-subtle)",
  };

  const removeButtonStyle: CSSProperties = {
    background: "none",
    border: "none",
    padding: 0,
    cursor: "pointer",
    color: "var(--ink-subtle)",
    fontSize: "14px",
    lineHeight: 1,
    display: "flex",
    alignItems: "center",
  };

  const inlineFormStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
  };

  const inlineInputStyle: CSSProperties = {
    fontFamily: "var(--font-nunito)",
    fontSize: "10px",
    padding: "4px 8px",
    border: nameError ? "1px solid #DC2626" : "1px solid var(--border-med)",
    borderRadius: "6px",
    outline: "none",
    width: "100px",
    color: "var(--ink)",
    background: "var(--white)",
  };

  const inlineSelectStyle: CSSProperties = {
    fontFamily: "var(--font-nunito)",
    fontSize: "10px",
    padding: "4px 6px",
    border: "1px solid var(--border-med)",
    borderRadius: "6px",
    outline: "none",
    color: "var(--ink)",
    background: "var(--white)",
    cursor: "pointer",
  };

  const handleRemove = (field: string) => {
    const next = { ...schema };
    delete next[field];
    onChange(next);
  };

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed || !/^[a-z0-9_]+$/.test(trimmed)) {
      setNameError(true);
      return;
    }
    if (schema[trimmed]) {
      setNameError(true);
      return;
    }
    setNameError(false);
    onChange({ ...schema, [trimmed]: { type: newType as SchemaField["type"], direction: "input" } });
    setNewName("");
    setNewType("string");
    setAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
    if (e.key === "Escape") {
      setAdding(false);
      setNewName("");
      setNameError(false);
    }
  };

  return (
    <div style={stripStyle}>
      {Object.entries(schema).map(([field, fieldDef]) => (
        <span key={field} style={pillStyle}>
          <span style={dotStyle(fieldDef.type)} />
          <span style={fieldNameStyle}>{field}</span>
          <span style={typeLabelStyle}>
            {fieldDef.type}
            {fieldDef.type === "enum" && fieldDef.options ? ` [${fieldDef.options.join(", ")}]` : ""}
          </span>
          {!readOnly && (
            <button
              type="button"
              style={removeButtonStyle}
              onClick={() => handleRemove(field)}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--ink)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--ink-subtle)"; }}
              aria-label={`Remove ${field}`}
            >
              &times;
            </button>
          )}
        </span>
      ))}

      {!readOnly && !adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          style={{
            background: "none",
            border: "none",
            fontFamily: "var(--font-nunito)",
            fontSize: "10px",
            color: "var(--ink-muted)",
            cursor: "pointer",
            padding: "4px 8px",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--ink)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--ink-muted)"; }}
        >
          + Add field
        </button>
      )}

      {!readOnly && adding && (
        <span style={inlineFormStyle}>
          <input
            autoFocus
            style={inlineInputStyle}
            placeholder="field_name"
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              setNameError(false);
            }}
            onKeyDown={handleKeyDown}
          />
          <select
            style={inlineSelectStyle}
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
          >
            <option value="string">string</option>
            <option value="number">number</option>
            <option value="boolean">boolean</option>
            <option value="enum">enum</option>
          </select>
          <Button variant="primary" size="sm" onClick={handleAdd}>
            Add
          </Button>
          <button
            type="button"
            onClick={() => { setAdding(false); setNewName(""); setNameError(false); }}
            style={removeButtonStyle}
            aria-label="Cancel"
          >
            &times;
          </button>
        </span>
      )}
    </div>
  );
}

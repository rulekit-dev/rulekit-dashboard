"use client";

import React, { useState, useRef, useEffect, CSSProperties } from "react";
import type { SchemaField } from "@/lib/types";

interface FieldsEditorProps {
  schema: Record<string, SchemaField>;
  onChange: (schema: Record<string, SchemaField>) => void;
  readOnly?: boolean;
}

const TYPE_OPTIONS: { value: SchemaField["type"]; label: string; color: string; bg: string }[] = [
  { value: "string", label: "string", color: "#7C3AED", bg: "var(--purple-dim)" },
  { value: "number", label: "number", color: "#2563EB", bg: "var(--blue-dim)" },
  { value: "boolean", label: "boolean", color: "#D97706", bg: "#FEF3C7" },
  { value: "enum", label: "enum", color: "#16A34A", bg: "var(--green-dim)" },
];

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  string: { bg: "var(--purple-dim)", text: "#7C3AED" },
  number: { bg: "var(--blue-dim)", text: "#2563EB" },
  boolean: { bg: "#FEF3C7", text: "#D97706" },
  enum: { bg: "var(--green-dim)", text: "#16A34A" },
};

function TypeDropdown({
  value,
  onChange,
}: {
  value: SchemaField["type"];
  onChange: (v: SchemaField["type"]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const selected = TYPE_OPTIONS.find((o) => o.value === value) || TYPE_OPTIONS[0];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setOpen(!open); }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          padding: "7px 10px",
          background: open ? "var(--surface-2)" : hovered ? "var(--surface)" : "var(--white)",
          borderWidth: "1px",
          borderStyle: "solid",
          borderColor: open ? "var(--border-med)" : hovered ? "var(--border-med)" : "var(--border-med)",
          borderRadius: 6,
          cursor: "pointer",
          transition: "all 0.15s ease",
          boxSizing: "border-box",
        }}
      >
        <span style={{ ...typeBadgeInlineStyle, background: selected.bg, color: selected.color }}>
          {selected.label}
        </span>
        <span style={{ flex: 1 }} />
        <ChevronIcon open={open} />
      </div>

      {open && (
        <div style={dropdownMenuStyle}>
          {TYPE_OPTIONS.map((opt) => {
            const isSelected = opt.value === value;
            const isHov = hoveredItem === opt.value;
            return (
              <div
                key={opt.value}
                role="button"
                tabIndex={0}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                onKeyDown={(e) => { if (e.key === "Enter") { onChange(opt.value); setOpen(false); } }}
                onMouseEnter={() => setHoveredItem(opt.value)}
                onMouseLeave={() => setHoveredItem(null)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 9px",
                  borderRadius: 6,
                  cursor: "pointer",
                  background: isSelected ? "var(--surface)" : isHov ? "var(--surface)" : "transparent",
                  transition: "background 0.12s",
                }}
              >
                <span style={{ ...typeBadgeInlineStyle, background: opt.bg, color: opt.color }}>
                  {opt.label}
                </span>
                <span style={{ flex: 1 }} />
                {isSelected && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="var(--orange)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      style={{
        flexShrink: 0,
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 0.2s ease",
      }}
    >
      <path
        d="M3 4.5L6 7.5L9 4.5"
        stroke="var(--ink-subtle)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function FieldsEditor({ schema, onChange, readOnly = false }: FieldsEditorProps) {
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<SchemaField["type"]>("string");
  const [newOptions, setNewOptions] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

  const fields = Object.entries(schema);

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed || !/^[a-z0-9_]+$/.test(trimmed)) {
      setNameError("Must be lowercase alphanumeric with underscores");
      return;
    }
    if (schema[trimmed]) {
      setNameError("Field already exists");
      return;
    }
    const field: SchemaField = { type: newType };
    if (newType === "enum" && newOptions.trim()) {
      field.options = newOptions.split(",").map((o) => o.trim()).filter(Boolean);
    }
    onChange({ ...schema, [trimmed]: field });
    setNewName("");
    setNewType("string");
    setNewOptions("");
    setNameError(null);
  };

  const handleRemove = (name: string) => {
    const next = { ...schema };
    delete next[name];
    onChange(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h2 style={titleStyle}>Schema Fields</h2>
        <span style={countStyle}>{fields.length} field{fields.length !== 1 ? "s" : ""}</span>
      </div>

      <div style={descriptionStyle}>
        Define the input fields for your ruleset. These fields will be available as conditions in your rules.
      </div>

      {fields.length > 0 && (
        <div style={tableContainerStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Options</th>
                {!readOnly && <th style={{ ...thStyle, width: 48 }} />}
              </tr>
            </thead>
            <tbody>
              {fields.map(([name, def]) => {
                const colors = TYPE_COLORS[def.type] || TYPE_COLORS.string;
                return (
                  <tr key={name} style={rowStyle}>
                    <td style={tdStyle}>
                      <span style={fieldNameStyle}>{name}</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ ...typeBadgeStyle, background: colors.bg, color: colors.text }}>
                        {def.type}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={optionsStyle}>
                        {def.type === "enum" && def.options ? def.options.join(", ") : "—"}
                      </span>
                    </td>
                    {!readOnly && (
                      <td style={{ ...tdStyle, textAlign: "right" }}>
                        <button
                          onClick={() => handleRemove(name)}
                          style={removeBtnStyle}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#DC2626"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--ink-subtle)"; }}
                        >
                          &times;
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {fields.length === 0 && (
        <div style={emptyStyle}>
          No fields defined yet. Add your first field below.
        </div>
      )}

      {!readOnly && (
        <div style={addFormStyle}>
          <div style={addFormRowStyle}>
            <div style={{ flex: 2 }}>
              <label style={formLabelStyle}>Field name</label>
              <input
                value={newName}
                onChange={(e) => { setNewName(e.target.value); setNameError(null); }}
                onKeyDown={handleKeyDown}
                placeholder="field_name"
                style={{
                  ...inputStyle,
                  borderColor: nameError ? "#DC2626" : "var(--border-med)",
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={formLabelStyle}>Type</label>
              <TypeDropdown value={newType} onChange={setNewType} />
            </div>
            {newType === "enum" && (
              <div style={{ flex: 2 }}>
                <label style={formLabelStyle}>Options (comma-separated)</label>
                <input
                  value={newOptions}
                  onChange={(e) => setNewOptions(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="option1, option2"
                  style={inputStyle}
                />
              </div>
            )}
            <div style={{ alignSelf: "flex-end" }}>
              <button onClick={handleAdd} style={addBtnStyle}>
                Add field
              </button>
            </div>
          </div>
          {nameError && <div style={errorStyle}>{nameError}</div>}
        </div>
      )}
    </div>
  );
}

const containerStyle: CSSProperties = {
  padding: "24px 32px",
  maxWidth: 720,
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: 10,
  marginBottom: 4,
};

const titleStyle: CSSProperties = {
  fontWeight: 700,
  fontSize: 16,
  color: "var(--ink)",
  margin: 0,
};

const countStyle: CSSProperties = {
  fontFamily: "var(--font-nunito)",
  fontSize: 12,
  color: "var(--ink-subtle)",
};

const descriptionStyle: CSSProperties = {
  fontFamily: "var(--font-nunito)",
  fontSize: 13,
  color: "var(--ink-muted)",
  marginBottom: 20,
  lineHeight: 1.5,
};

const tableContainerStyle: CSSProperties = {
  background: "var(--white)",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "var(--border)",
  borderRadius: 10,
  overflow: "hidden",
  marginBottom: 16,
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const thStyle: CSSProperties = {
  fontFamily: "var(--font-nunito)",
  fontSize: 10,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "var(--ink-subtle)",
  padding: "10px 14px",
  textAlign: "left",
  background: "var(--surface)",
  borderBottom: "1px solid var(--border)",
};

const rowStyle: CSSProperties = {
  borderBottom: "1px solid var(--border)",
};

const tdStyle: CSSProperties = {
  padding: "10px 14px",
  verticalAlign: "middle",
};

const fieldNameStyle: CSSProperties = {
  fontFamily: "var(--font-dm-mono)",
  fontSize: 13,
  fontWeight: 500,
  color: "var(--ink)",
};

const typeBadgeStyle: CSSProperties = {
  fontFamily: "var(--font-nunito)",
  fontSize: 11,
  fontWeight: 600,
  padding: "2px 10px",
  borderRadius: 12,
  display: "inline-block",
};

const typeBadgeInlineStyle: CSSProperties = {
  fontFamily: "var(--font-nunito)",
  fontSize: 11,
  fontWeight: 600,
  padding: "2px 10px",
  borderRadius: 12,
  display: "inline-block",
};

const optionsStyle: CSSProperties = {
  fontFamily: "var(--font-nunito)",
  fontSize: 12,
  color: "var(--ink-muted)",
};

const removeBtnStyle: CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: 18,
  lineHeight: 1,
  color: "var(--ink-subtle)",
  padding: "2px 4px",
};

const emptyStyle: CSSProperties = {
  fontFamily: "var(--font-nunito)",
  fontSize: 13,
  color: "var(--ink-subtle)",
  padding: "32px 0",
  textAlign: "center",
  background: "var(--surface)",
  borderRadius: 10,
  borderWidth: "1px",
  borderStyle: "dashed",
  borderColor: "var(--border-med)",
  marginBottom: 16,
};

const addFormStyle: CSSProperties = {
  background: "var(--surface)",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "var(--border)",
  borderRadius: 10,
  padding: "16px",
};

const addFormRowStyle: CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "flex-start",
};

const formLabelStyle: CSSProperties = {
  fontFamily: "var(--font-nunito)",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--ink-muted)",
  display: "block",
  marginBottom: 4,
};

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "var(--font-dm-mono)",
  fontSize: 13,
  padding: "7px 10px",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "var(--border-med)",
  borderRadius: 6,
  outline: "none",
  color: "var(--ink)",
  background: "var(--white)",
};

const addBtnStyle: CSSProperties = {
  fontFamily: "var(--font-nunito)",
  fontWeight: 600,
  fontSize: 13,
  padding: "7px 16px",
  borderRadius: 6,
  borderWidth: "0",
  borderStyle: "solid",
  borderColor: "transparent",
  background: "var(--orange)",
  color: "var(--white)",
  cursor: "pointer",
  whiteSpace: "nowrap",
  lineHeight: 1.4,
  transition: "background 0.15s",
};

const dropdownMenuStyle: CSSProperties = {
  position: "absolute",
  top: "calc(100% + 4px)",
  left: 0,
  right: 0,
  background: "var(--white)",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "var(--border-med)",
  borderRadius: 9,
  padding: 4,
  boxShadow: "0 8px 32px rgba(28,28,26,0.12)",
  zIndex: 50,
};

const errorStyle: CSSProperties = {
  fontFamily: "var(--font-nunito)",
  fontSize: 12,
  color: "#DC2626",
  marginTop: 8,
};

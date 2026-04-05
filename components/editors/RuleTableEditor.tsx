"use client";

import React, { useState, useCallback, useMemo, useEffect, useRef, CSSProperties } from "react";
import { Plus, X } from "lucide-react";
import type { DSL, RuleNode, DecisionRow, Condition, SchemaField } from "@/lib/types";

interface RuleTableEditorProps {
  dsl: DSL;
  nodeId: string;
  onChange: (dsl: DSL) => void;
}

type Op = Condition["op"];

const ALL_OP_OPTIONS: { value: Op; label: string }[] = [
  { value: "eq", label: "=" },
  { value: "neq", label: "!=" },
  { value: "gt", label: ">" },
  { value: "gte", label: ">=" },
  { value: "lt", label: "<" },
  { value: "lte", label: "<=" },
  { value: "contains", label: "contains" },
  { value: "not_contains", label: "!contains" },
];

const STRING_OPS: Op[] = ["eq", "neq", "contains", "not_contains"];
const NUMBER_OPS: Op[] = ["eq", "neq", "gt", "gte", "lt", "lte"];
const BOOLEAN_OPS: Op[] = ["eq", "neq"];
const ENUM_OPS: Op[] = ["eq", "neq"];

function getOpsForType(type: string): { value: Op; label: string }[] {
  switch (type) {
    case "number": return ALL_OP_OPTIONS.filter((o) => NUMBER_OPS.includes(o.value));
    case "boolean": return ALL_OP_OPTIONS.filter((o) => BOOLEAN_OPS.includes(o.value));
    case "enum": return ALL_OP_OPTIONS.filter((o) => ENUM_OPS.includes(o.value));
    default: return ALL_OP_OPTIONS.filter((o) => STRING_OPS.includes(o.value));
  }
}

// --- Pickers (rendered inline in group header) ---

function InputColumnPicker({
  allFields,
  predecessorFields,
  selectedFields,
  onAdd,
}: {
  allFields: [string, SchemaField][];
  predecessorFields: [string, SchemaField][];
  selectedFields: string[];
  onAdd: (field: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const availableSchema = allFields.filter(([f]) => !selectedFields.includes(f));
  const availablePredecessor = predecessorFields.filter(([f]) => !selectedFields.includes(f));
  const hasAny = availableSchema.length > 0 || availablePredecessor.length > 0;

  if (!hasAny) return null;

  const handleOpen = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen(!open);
  };

  return (
    <div style={{ display: "inline-flex", marginLeft: 6 }}>
      <button ref={btnRef} type="button" onClick={handleOpen} style={addColBtnStyle} title="Add input column">
        <Plus size={12} />
      </button>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 50 }} onClick={() => setOpen(false)} />
          <div style={{ ...fixedDropdownStyle, top: pos.top, left: pos.left }}>
            {availableSchema.length > 0 && (
              <>
                <div style={pickerTitleStyle}>Schema inputs</div>
                {availableSchema.map(([field, { type }]) => (
                  <button
                    key={field}
                    onClick={() => { onAdd(field); setOpen(false); }}
                    style={pickerItemStyle}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--surface)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <span style={{ fontFamily: "var(--font-dm-mono)", fontSize: 12 }}>{field}</span>
                    <span style={{ fontFamily: "var(--font-nunito)", fontSize: 10, color: "var(--ink-subtle)", marginLeft: "auto" }}>{type}</span>
                  </button>
                ))}
              </>
            )}
            {availablePredecessor.length > 0 && (
              <>
                <div style={pickerTitleStyle}>From previous nodes</div>
                {availablePredecessor.map(([field, { type }]) => (
                  <button
                    key={field}
                    onClick={() => { onAdd(field); setOpen(false); }}
                    style={pickerItemStyle}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--surface)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <span style={{ fontFamily: "var(--font-dm-mono)", fontSize: 12 }}>{field}</span>
                    <span style={{ fontFamily: "var(--font-nunito)", fontSize: 10, color: "var(--orange)", marginLeft: "auto" }}>{type}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function OutputColumnPicker({
  allFields,
  selectedFields,
  onAdd,
}: {
  allFields: [string, SchemaField][];
  selectedFields: string[];
  onAdd: (field: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const available = allFields.filter(([f]) => !selectedFields.includes(f));

  if (available.length === 0) return null;

  const handleOpen = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen(!open);
  };

  return (
    <div style={{ display: "inline-flex", marginLeft: 6 }}>
      <button ref={btnRef} type="button" onClick={handleOpen} style={addOutputColBtnStyle} title="Add output column">
        <Plus size={12} />
      </button>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 50 }} onClick={() => setOpen(false)} />
          <div style={{ ...fixedDropdownStyle, top: pos.top, left: pos.left }}>
            <div style={pickerTitleStyle}>Add output column</div>
            {available.map(([field, { type }]) => (
              <button
                key={field}
                onClick={() => { onAdd(field); setOpen(false); }}
                style={pickerItemStyle}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--surface)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <span style={{ fontFamily: "var(--font-dm-mono)", fontSize: 12 }}>{field}</span>
                <span style={{ fontFamily: "var(--font-nunito)", fontSize: 10, color: "var(--orange)", marginLeft: "auto" }}>{type}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// --- Editable cells ---

function ValueDropdown({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const handleOpen = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 2, left: rect.left });
    }
    setOpen(true);
  };

  const allOptions = ["", ...options];

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        style={{
          ...opDropdownBtnStyle,
          color: value ? "var(--ink)" : "var(--ink-subtle)",
          fontWeight: value ? 500 : 400,
          minWidth: 80,
        }}
      >
        <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {value || "-"}
        </span>
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{ opacity: 0.4, flexShrink: 0 }}>
          <path d="M2 3L4 5L6 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 50 }} onClick={() => setOpen(false)} />
          <div style={{ ...fixedDropdownStyle, top: pos.top, left: pos.left, minWidth: 120 }}>
            {allOptions.map((opt) => (
              <button
                key={opt === "" ? "__empty__" : opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                onMouseEnter={() => setHoveredItem(opt)}
                onMouseLeave={() => setHoveredItem(null)}
                style={{
                  ...opDropdownItemStyle,
                  background: opt === value ? "var(--orange-dim)" : hoveredItem === opt ? "var(--surface)" : "transparent",
                  color: opt === value ? "var(--orange-deep)" : opt === "" ? "var(--ink-subtle)" : "var(--ink-muted)",
                  fontWeight: opt === value ? 600 : 500,
                  fontStyle: opt === "" ? "italic" : "normal",
                }}
              >
                {opt || "-"}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function OpDropdown({
  value,
  options,
  onChange,
}: {
  value: Op;
  options: { value: Op; label: string }[];
  onChange: (op: Op) => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const current = options.find((o) => o.value === value) ?? options[0];

  const handleOpen = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 2, left: rect.left });
    }
    setOpen(true);
  };

  return (
    <>
      <button ref={btnRef} type="button" onClick={handleOpen} style={opDropdownBtnStyle}>
        <span>{current.label}</span>
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{ opacity: 0.4 }}>
          <path d="M2 3L4 5L6 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 50 }} onClick={() => setOpen(false)} />
          <div style={{ ...fixedDropdownStyle, top: pos.top, left: pos.left, minWidth: 100 }}>
            {options.map((o) => (
              <button
                key={o.value}
                onClick={() => { onChange(o.value); setOpen(false); }}
                style={{
                  ...opDropdownItemStyle,
                  background: o.value === value ? "var(--orange-dim)" : "transparent",
                  color: o.value === value ? "var(--orange-deep)" : "var(--ink-muted)",
                  fontWeight: o.value === value ? 600 : 500,
                }}
                onMouseEnter={(e) => { if (o.value !== value) (e.currentTarget as HTMLElement).style.background = "var(--surface)"; }}
                onMouseLeave={(e) => { if (o.value !== value) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function ConditionCell({
  condition,
  fieldDef,
  onSave,
}: {
  condition: Condition | undefined;
  fieldDef: SchemaField | undefined;
  onSave: (c: Condition | null) => void;
}) {
  const fieldType = fieldDef?.type ?? "string";
  const opOptions = useMemo(() => getOpsForType(fieldType), [fieldType]);
  const [op, setOp] = useState<Op>(condition?.op ?? "eq");
  const [val, setVal] = useState<string>(condition ? String(condition.value) : "");

  useEffect(() => {
    setOp(condition?.op ?? "eq");
    setVal(condition ? String(condition.value) : "");
  }, [condition]);

  const commit = () => {
    if (val.trim() === "") {
      onSave(null);
      return;
    }
    let parsed: string | number | boolean = val;
    if (fieldType === "number") parsed = Number(val);
    if (fieldType === "boolean") parsed = val === "true";
    onSave({ field: "", op, value: parsed });
  };

  const handleOpChange = (newOp: Op) => {
    setOp(newOp);
    if (val.trim() !== "") {
      let parsed: string | number | boolean = val;
      if (fieldType === "number") parsed = Number(val);
      if (fieldType === "boolean") parsed = val === "true";
      onSave({ field: "", op: newOp, value: parsed });
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <OpDropdown value={op} options={opOptions} onChange={handleOpChange} />
      {fieldType === "boolean" ? (
        <ValueDropdown
          value={val}
          options={["true", "false"]}
          onChange={(v) => { setVal(v); const parsed = v === "true" ? true : v === "false" ? false : undefined; if (parsed !== undefined) onSave({ field: "", op, value: parsed }); else onSave(null); }}
        />
      ) : fieldType === "enum" && fieldDef?.options ? (
        <ValueDropdown
          value={val}
          options={fieldDef.options}
          onChange={(v) => { setVal(v); if (v) onSave({ field: "", op, value: v }); else onSave(null); }}
        />
      ) : (
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); }}
          type={fieldType === "number" ? "number" : "text"}
          placeholder="-"
          style={cellValueInputStyle}
        />
      )}
    </div>
  );
}

function OutputCell({
  value,
  fieldDef,
  onSave,
}: {
  value: unknown;
  fieldDef: SchemaField | undefined;
  onSave: (v: string) => void;
}) {
  const [draft, setDraft] = useState(String(value ?? ""));

  useEffect(() => {
    setDraft(String(value ?? ""));
  }, [value]);

  const commit = () => { onSave(draft); };

  if (fieldDef?.type === "enum" && fieldDef.options) {
    return (
      <ValueDropdown
        value={draft}
        options={fieldDef.options}
        onChange={(v) => { setDraft(v); onSave(v); }}
      />
    );
  }

  if (fieldDef?.type === "boolean") {
    return (
      <ValueDropdown
        value={draft}
        options={["true", "false"]}
        onChange={(v) => { setDraft(v); onSave(v); }}
      />
    );
  }

  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") commit(); }}
      placeholder="-"
      type={fieldDef?.type === "number" ? "number" : "text"}
      style={cellValueInputStyle}
    />
  );
}

// --- Main component ---

export default function RuleTableEditor({ dsl, nodeId, onChange }: RuleTableEditorProps) {
  const node = dsl.nodes.find((n) => n.id === nodeId);
  if (!node) return <div style={emptyStyle}>Rule node not found</div>;

  const inputSchemaFields = useMemo(() => Object.entries(dsl.schema).filter(([, f]) => f.direction === "input"), [dsl.schema]);
  const outputSchemaFields = useMemo(() => Object.entries(dsl.schema).filter(([, f]) => f.direction === "output"), [dsl.schema]);

  // Collect outputs from all predecessor nodes (nodes with edges pointing to this node)
  const predecessorOutputFields = useMemo((): [string, SchemaField][] => {
    const predecessorIds = new Set(
      dsl.edges.filter((e) => e.to === nodeId).map((e) => e.from)
    );
    const seen = new Set<string>();
    const fields: [string, SchemaField][] = [];
    for (const predId of predecessorIds) {
      const predNode = dsl.nodes.find((n) => n.id === predId);
      if (!predNode) continue;
      for (const col of predNode.outputColumns) {
        if (!seen.has(col)) {
          seen.add(col);
          const schemaDef = dsl.schema[col];
          fields.push([col, schemaDef ?? { type: "string", direction: "output" }]);
        }
      }
    }
    return fields;
  }, [dsl.edges, dsl.nodes, dsl.schema, nodeId]);

  // Merged field lookup: schema fields + predecessor output fields (for ConditionCell type resolution)
  const allInputFieldDefs = useMemo((): Record<string, SchemaField> => {
    const merged: Record<string, SchemaField> = { ...dsl.schema };
    for (const [field, def] of predecessorOutputFields) {
      if (!merged[field]) merged[field] = def;
    }
    return merged;
  }, [dsl.schema, predecessorOutputFields]);

  const updateNode = useCallback(
    (updater: (n: RuleNode) => RuleNode) => {
      onChange({
        ...dsl,
        nodes: dsl.nodes.map((n) => (n.id === nodeId ? updater(n) : n)),
      });
    },
    [dsl, nodeId, onChange]
  );

  const addInputColumn = useCallback((field: string) => {
    updateNode((n) => ({ ...n, inputColumns: [...n.inputColumns, field] }));
  }, [updateNode]);

  const removeInputColumn = useCallback((field: string) => {
    updateNode((n) => ({
      ...n,
      inputColumns: n.inputColumns.filter((f) => f !== field),
      rows: n.rows.map((row) => {
        const conditions = { ...row.conditions };
        delete conditions[field];
        return { ...row, conditions };
      }),
    }));
  }, [updateNode]);

  const addOutputColumn = useCallback((key: string) => {
    updateNode((n) => ({
      ...n,
      outputColumns: [...n.outputColumns, key],
      rows: n.rows.map((row) => ({ ...row, outputs: { ...row.outputs, [key]: "" } })),
    }));
  }, [updateNode]);

  const removeOutputColumn = useCallback((key: string) => {
    updateNode((n) => ({
      ...n,
      outputColumns: n.outputColumns.filter((k) => k !== key),
      rows: n.rows.map((row) => {
        const outputs = { ...row.outputs };
        delete outputs[key];
        return { ...row, outputs };
      }),
    }));
  }, [updateNode]);

  const makeRow = useCallback((): DecisionRow => ({
    id: typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now().toString(),
    conditions: {},
    outputs: Object.fromEntries(node.outputColumns.map((k) => [k, ""])),
  }), [node.outputColumns]);

  const addRow = useCallback(() => {
    updateNode((n) => ({ ...n, rows: [...n.rows, makeRow()] }));
  }, [updateNode, makeRow]);

  const deleteRow = useCallback((rowId: string) => {
    updateNode((n) => ({ ...n, rows: n.rows.filter((row) => row.id !== rowId) }));
  }, [updateNode]);

  const updateRowCondition = useCallback((rowId: string, field: string, condition: Condition | null) => {
    updateNode((n) => ({
      ...n,
      rows: n.rows.map((row) => {
        if (row.id !== rowId) return row;
        const conditions = { ...row.conditions };
        if (condition) {
          conditions[field] = { ...condition, field };
        } else {
          delete conditions[field];
        }
        return { ...row, conditions };
      }),
    }));
  }, [updateNode]);

  const updateRowOutput = useCallback((rowId: string, key: string, value: string) => {
    updateNode((n) => ({
      ...n,
      rows: n.rows.map((row) => {
        if (row.id !== rowId) return row;
        return { ...row, outputs: { ...row.outputs, [key]: value === "" ? undefined : value } };
      }),
    }));
  }, [updateNode]);

  useEffect(() => {
    if ((node.inputColumns.length > 0 || node.outputColumns.length > 0) && node.rows.length === 0) {
      addRow();
    }
  }, [node.inputColumns.length, node.outputColumns.length, node.rows.length, addRow]);

  const { inputColumns, outputColumns, rows } = node;
  const inputCount = inputColumns.length;
  const outputCount = outputColumns.length;
  // total columns: # + inputs + outputs + actions
  const totalCols = 1 + inputCount + outputCount + 1;

  return (
    <div style={containerStyle}>
      <div style={tableContainerStyle}>
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              {/* Row 1: Group headers */}
              <tr>
                <th style={{ ...groupThStyle, borderRight: "1px solid var(--border)" }} rowSpan={2}>
                  <span style={colNumStyle}>#</span>
                </th>

                {/* Inputs group header — always show even if 0 columns, so the + button is visible */}
                <th
                  style={{ ...groupThStyle, borderRight: outputCount > 0 ? "2px solid var(--border-med)" : "1px solid var(--border)" }}
                  colSpan={Math.max(inputCount, 1)}
                >
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span style={groupLabelStyle}>Inputs</span>
                    <InputColumnPicker allFields={inputSchemaFields} predecessorFields={predecessorOutputFields} selectedFields={inputColumns} onAdd={addInputColumn} />
                  </div>
                </th>

                {/* Outputs group header — always show */}
                <th
                  style={{ ...outputGroupThStyle, borderRight: "1px solid var(--border)" }}
                  colSpan={Math.max(outputCount, 1)}
                >
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span style={{ ...groupLabelStyle, color: "var(--orange-deep)" }}>Outputs</span>
                    <OutputColumnPicker allFields={outputSchemaFields} selectedFields={outputColumns} onAdd={addOutputColumn} />
                  </div>
                </th>

                <th style={{ ...groupThStyle, width: 48 }} rowSpan={2} />
              </tr>

              {/* Row 2: Column headers */}
              <tr>
                {inputCount > 0 ? (
                  inputColumns.map((field, i) => (
                    <th
                      key={`in_${field}`}
                      style={{
                        ...colThStyle,
                        borderRight: i === inputCount - 1 && outputCount > 0
                          ? "2px solid var(--border-med)"
                          : "1px solid var(--border)",
                      }}
                    >
                      <div style={colHeaderInnerStyle}>
                        <div>
                          <div style={colHeaderLabelStyle}>{fieldLabel(field)}</div>
                          <div style={colHeaderFieldStyle}>
                            {field}
                            <span style={colHeaderTypeBadge}>{allInputFieldDefs[field]?.type ?? "?"}</span>
                          </div>
                        </div>
                        <button type="button" onClick={() => removeInputColumn(field)} style={colRemoveBtnStyle} title={`Remove ${field}`}>
                          <X size={12} />
                        </button>
                      </div>
                    </th>
                  ))
                ) : (
                  <th style={{ ...colThStyle, borderRight: outputCount > 0 ? "2px solid var(--border-med)" : "1px solid var(--border)" }}>
                    <span style={{ fontFamily: "var(--font-nunito)", fontSize: 10, color: "var(--ink-subtle)", fontStyle: "italic" }}>
                      No inputs
                    </span>
                  </th>
                )}

                {outputCount > 0 ? (
                  outputColumns.map((key) => (
                    <th key={`out_${key}`} style={{ ...outputColThStyle, borderRight: "1px solid var(--border)" }}>
                      <div style={colHeaderInnerStyle}>
                        <div>
                          <div style={colHeaderLabelStyle}>{fieldLabel(key)}</div>
                          <div style={{ ...colHeaderFieldStyle, color: "var(--orange)" }}>{key}</div>
                        </div>
                        <button type="button" onClick={() => removeOutputColumn(key)} style={{ ...colRemoveBtnStyle, color: "var(--orange)" }} title={`Remove ${key}`}>
                          <X size={12} />
                        </button>
                      </div>
                    </th>
                  ))
                ) : (
                  <th style={{ ...outputColThStyle, borderRight: "1px solid var(--border)" }}>
                    <span style={{ fontFamily: "var(--font-nunito)", fontSize: 10, color: "var(--orange)", fontStyle: "italic", opacity: 0.6 }}>
                      No outputs
                    </span>
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {rows.map((row, idx) => (
                <tr
                  key={row.id}
                  style={bodyRowStyle}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(240,90,40,0.02)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <td style={indexTdStyle}>{idx + 1}</td>

                  {inputCount > 0 ? (
                    inputColumns.map((field, i) => (
                      <td
                        key={`in_${field}`}
                        style={{
                          ...tdStyle,
                          borderRight: i === inputCount - 1 && outputCount > 0
                            ? "2px solid var(--border-med)"
                            : "1px solid var(--border)",
                        }}
                      >
                        <ConditionCell
                          condition={row.conditions[field]}
                          fieldDef={allInputFieldDefs[field]}
                          onSave={(c) => updateRowCondition(row.id, field, c)}
                        />
                      </td>
                    ))
                  ) : (
                    <td style={{ ...tdStyle, borderRight: outputCount > 0 ? "2px solid var(--border-med)" : "1px solid var(--border)" }} />
                  )}

                  {outputCount > 0 ? (
                    outputColumns.map((key) => (
                      <td key={`out_${key}`} style={{ ...outputTdStyle, borderRight: "1px solid var(--border)" }}>
                        <OutputCell
                          value={row.outputs[key]}
                          fieldDef={dsl.schema[key]}
                          onSave={(v) => updateRowOutput(row.id, key, v)}
                        />
                      </td>
                    ))
                  ) : (
                    <td style={{ ...outputTdStyle, borderRight: "1px solid var(--border)" }} />
                  )}

                  <td style={{ ...tdStyle, textAlign: "center", width: 48 }}>
                    <button onClick={() => deleteRow(row.id)} style={rowRemoveBtnStyle} title="Delete row">
                      <X size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add row — full-width button */}
        <button
          type="button"
          onClick={addRow}
          style={addRowBtnStyle}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--surface)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          <Plus size={14} style={{ flexShrink: 0 }} />
          <span>Add row</span>
        </button>
      </div>
    </div>
  );
}

function fieldLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

// ---- Styles ----

const containerStyle: CSSProperties = {
  padding: "24px 32px",
  overflow: "auto",
  height: "100%",
  boxSizing: "border-box",
};

const tableContainerStyle: CSSProperties = {
  background: "var(--white)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  overflow: "hidden",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  tableLayout: "auto",
};

// Group header row
const groupThStyle: CSSProperties = {
  padding: "6px 12px",
  textAlign: "left",
  background: "var(--surface)",
  borderBottom: "1px solid var(--border)",
  verticalAlign: "middle",
};

const outputGroupThStyle: CSSProperties = {
  ...groupThStyle,
  background: "var(--orange-dim)",
};

const groupLabelStyle: CSSProperties = {
  fontFamily: "var(--font-nunito)",
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--ink-muted)",
};

const colNumStyle: CSSProperties = {
  fontFamily: "var(--font-nunito)",
  fontSize: 10,
  color: "var(--ink-subtle)",
};

// Column header row
const colThStyle: CSSProperties = {
  padding: "6px 12px",
  textAlign: "left",
  background: "var(--surface)",
  borderBottom: "1px solid var(--border)",
  verticalAlign: "top",
  minWidth: 160,
};

const outputColThStyle: CSSProperties = {
  ...colThStyle,
  background: "var(--orange-dim)",
};

const colHeaderInnerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 8,
};

const colHeaderLabelStyle: CSSProperties = {
  fontFamily: "var(--font-nunito)",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--ink)",
  marginBottom: 1,
};

const colHeaderFieldStyle: CSSProperties = {
  fontFamily: "var(--font-dm-mono)",
  fontSize: 10,
  color: "var(--ink-subtle)",
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
};

const colHeaderTypeBadge: CSSProperties = {
  fontFamily: "var(--font-nunito)",
  fontSize: 9,
  padding: "1px 4px",
  borderRadius: 3,
  background: "var(--surface-2)",
  color: "var(--ink-subtle)",
};

const colRemoveBtnStyle: CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "var(--ink-subtle)",
  padding: 2,
  opacity: 0.5,
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
};

// Body
const bodyRowStyle: CSSProperties = {
  borderBottom: "1px solid var(--border)",
};

const indexTdStyle: CSSProperties = {
  padding: "6px 12px",
  verticalAlign: "middle",
  fontFamily: "var(--font-nunito)",
  fontSize: 11,
  color: "var(--ink-subtle)",
  borderRight: "1px solid var(--border)",
  width: 40,
  textAlign: "center",
};

const tdStyle: CSSProperties = {
  padding: "6px 8px",
  verticalAlign: "middle",
};

const outputTdStyle: CSSProperties = {
  ...tdStyle,
  background: "rgba(240,90,40,0.02)",
};

// Cell controls
const opDropdownBtnStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontFamily: "var(--font-nunito)",
  fontSize: 11,
  fontWeight: 600,
  padding: "4px 8px",
  border: "1px solid var(--border)",
  borderRadius: 6,
  outline: "none",
  background: "var(--white)",
  color: "var(--orange)",
  cursor: "pointer",
  flexShrink: 0,
  whiteSpace: "nowrap",
};

const opDropdownItemStyle: CSSProperties = {
  display: "block",
  width: "100%",
  padding: "6px 10px",
  border: "none",
  cursor: "pointer",
  borderRadius: 6,
  textAlign: "left",
  fontFamily: "var(--font-nunito)",
  fontSize: 12,
  transition: "background 0.12s, color 0.12s",
};


const cellValueInputStyle: CSSProperties = {
  fontFamily: "var(--font-dm-mono)",
  fontSize: 11,
  padding: "4px 6px",
  border: "1px solid var(--border)",
  borderRadius: 4,
  outline: "none",
  background: "var(--white)",
  color: "var(--ink)",
  flex: 1,
  minWidth: 0,
  width: "100%",
  boxSizing: "border-box",
};

const rowRemoveBtnStyle: CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "var(--ink-subtle)",
  padding: 4,
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 4,
};

const addRowBtnStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  width: "100%",
  padding: "10px 12px",
  background: "transparent",
  border: "none",
  borderTop: "1px solid var(--border)",
  fontFamily: "var(--font-nunito)",
  fontSize: 12,
  color: "var(--ink-muted)",
  cursor: "pointer",
  transition: "background 0.1s",
};

const addColBtnStyle: CSSProperties = {
  background: "none",
  border: "1px dashed var(--border-med)",
  borderRadius: 4,
  width: 22,
  height: 22,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--ink-muted)",
  cursor: "pointer",
  padding: 0,
};

const addOutputColBtnStyle: CSSProperties = {
  ...addColBtnStyle,
  borderColor: "var(--orange)",
  color: "var(--orange)",
  opacity: 0.6,
};

const fixedDropdownStyle: CSSProperties = {
  position: "fixed",
  background: "var(--white)",
  border: "1px solid var(--border-med)",
  borderRadius: 9,
  boxShadow: "0 8px 32px rgba(28,28,26,0.12)",
  zIndex: 51,
  minWidth: 200,
  padding: 4,
  maxHeight: 240,
  overflowY: "auto",
};

const pickerTitleStyle: CSSProperties = {
  fontFamily: "var(--font-nunito)",
  fontSize: 10,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "var(--ink-subtle)",
  padding: "6px 9px 4px",
};

const pickerItemStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  width: "100%",
  padding: "7px 9px",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  borderRadius: 6,
  textAlign: "left",
  fontWeight: 500,
  color: "var(--ink-muted)",
  transition: "background 0.12s, color 0.12s",
};

const emptyStyle: CSSProperties = {
  fontFamily: "var(--font-nunito)",
  fontSize: 13,
  color: "var(--ink-subtle)",
  padding: 40,
  textAlign: "center",
};

"use client";

import React, { useState, CSSProperties } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: SelectOption[];
  hint?: string;
  error?: string;
  style?: CSSProperties;
}

export default function Select({
  label,
  value,
  onChange,
  options,
  hint,
  error,
  style,
}: SelectProps) {
  const [focused, setFocused] = useState(false);

  const labelStyle: CSSProperties = {
    fontWeight: 600,
    fontSize: "13px",
    color: "var(--ink)",
    marginBottom: "6px",
    display: "block",
  };

  const hintStyle: CSSProperties = {
    fontWeight: 400,
    fontSize: "12px",
    color: "var(--ink-muted)",
    marginTop: "3px",
  };

  const errorMessageStyle: CSSProperties = {
    fontWeight: 400,
    fontSize: "12px",
    color: "#DC2626",
    marginTop: "5px",
  };

  const selectStyle: CSSProperties = {
    width: "100%",
    background: "white",
    border: error
      ? "1px solid #DC2626"
      : focused
        ? "1px solid var(--orange)"
        : "1px solid var(--border-med)",
    borderRadius: "8px",
    padding: "9px 12px",
    paddingRight: "32px",
    fontWeight: 400,
    fontSize: "14px",
    color: "var(--ink)",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxShadow: error
      ? "0 0 0 3px rgba(220,38,38,0.1)"
      : focused
        ? "0 0 0 3px var(--orange-dim)"
        : "none",
    boxSizing: "border-box",
    appearance: "none",
    WebkitAppearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%235F5E5A' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 12px center",
    cursor: "pointer",
    ...style,
  };

  return (
    <div style={{ width: "100%" }}>
      {label && <label style={labelStyle}>{label}</label>}
      <select
        value={value}
        onChange={onChange}
        style={selectStyle}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <div style={errorMessageStyle}>{error}</div>}
      {!error && hint && <div style={hintStyle}>{hint}</div>}
    </div>
  );
}

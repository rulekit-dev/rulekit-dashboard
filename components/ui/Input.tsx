"use client";

import React, { useState, CSSProperties } from "react";

interface InputProps {
  label?: string;
  hint?: string;
  error?: string;
  mono?: boolean;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  style?: CSSProperties;
  id?: string;
  name?: string;
}

export default function Input({
  label,
  hint,
  error,
  mono = false,
  type = "text",
  value,
  onChange,
  placeholder,
  disabled = false,
  style,
  id,
  name,
}: InputProps) {
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

  const inputStyle: CSSProperties = {
    width: "100%",
    background: "white",
    border: error
      ? "1px solid #DC2626"
      : focused
        ? "1px solid var(--orange)"
        : "1px solid var(--border-med)",
    borderRadius: "8px",
    padding: "9px 12px",
    fontFamily: mono ? "var(--font-nunito)" : "inherit",
    fontWeight: 400,
    fontSize: mono ? "13px" : "14px",
    color: "var(--ink)",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxShadow: error
      ? "0 0 0 3px rgba(220,38,38,0.1)"
      : focused
        ? "0 0 0 3px var(--orange-dim)"
        : "none",
    boxSizing: "border-box",
    ...style,
  };

  return (
    <div style={{ width: "100%" }}>
      {label && <label style={labelStyle} htmlFor={id}>{label}</label>}
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        style={inputStyle}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {error && <div style={errorMessageStyle}>{error}</div>}
      {!error && hint && <div style={hintStyle}>{hint}</div>}
    </div>
  );
}

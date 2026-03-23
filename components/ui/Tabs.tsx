"use client";

import React, { CSSProperties } from "react";

interface Tab {
  key: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeKey: string;
  onChange: (key: string) => void;
  variant?: "pill" | "underline";
}

export default function Tabs({ tabs, activeKey, onChange, variant = "pill" }: TabsProps) {
  const containerStyle: CSSProperties = {
    display: "flex",
    flexDirection: "row",
    gap: variant === "pill" ? "4px" : "16px",
  };

  const getPillStyle = (isActive: boolean): CSSProperties => ({
    background: isActive ? "var(--orange-dim)" : "var(--surface-2)",
    color: isActive ? "var(--orange-deep)" : "var(--ink-muted)",
    fontSize: "13px",
    fontWeight: 600,
    padding: "6px 12px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    transition: "all 0.2s",
  });

  const getUnderlineStyle = (isActive: boolean): CSSProperties => ({
    background: "transparent",
    color: isActive ? "var(--ink)" : "var(--ink-muted)",
    fontSize: "14px",
    fontWeight: isActive ? 700 : 400,
    padding: "6px 0",
    border: "none",
    borderBottom: isActive ? "2px solid var(--orange)" : "2px solid transparent",
    cursor: "pointer",
    transition: "all 0.2s",
  });

  return (
    <div style={containerStyle}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        const tabStyle =
          variant === "pill"
            ? getPillStyle(isActive)
            : getUnderlineStyle(isActive);

        return (
          <button
            key={tab.key}
            type="button"
            style={tabStyle}
            onClick={() => onChange(tab.key)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

"use client";

import React, { CSSProperties } from "react";

type BadgeVariant = "ink" | "green" | "blue" | "amber" | "gray" | "red";

interface BadgeProps {
  variant: BadgeVariant;
  dot?: boolean;
  pill?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, { bg: string; color: string; border: string; dotColor: string }> = {
  ink: {
    bg: "rgba(28,28,26,0.06)",
    color: "var(--ink)",
    border: "1.5px solid rgba(28,28,26,0.12)",
    dotColor: "var(--ink)",
  },
  green: {
    bg: "var(--green-dim)",
    color: "var(--green-deep)",
    border: "1.5px solid rgba(26,127,75,0.2)",
    dotColor: "var(--green)",
  },
  blue: {
    bg: "var(--blue-dim)",
    color: "#1D4ED8",
    border: "1.5px solid rgba(37,99,235,0.2)",
    dotColor: "#1D4ED8",
  },
  amber: {
    bg: "var(--amber-dim)",
    color: "var(--amber)",
    border: "1.5px solid rgba(180,83,9,0.2)",
    dotColor: "var(--amber)",
  },
  red: {
    bg: "var(--red-dim)",
    color: "var(--red)",
    border: "1.5px solid rgba(201,42,42,0.2)",
    dotColor: "var(--red)",
  },
  gray: {
    bg: "var(--surface-2)",
    color: "var(--ink-muted)",
    border: "1.5px solid var(--border-med)",
    dotColor: "var(--ink-subtle)",
  },
};

export default function Badge({ variant, dot = false, pill = true, children }: BadgeProps) {
  const vs = variantStyles[variant];

  const badgeStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: "3px 8px",
    borderRadius: pill ? "20px" : "4px",
    background: vs.bg,
    color: vs.color,
    border: vs.border,
    fontWeight: 600,
    fontSize: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    lineHeight: 1.4,
    fontFamily: "var(--font-sans)",
  };

  const dotStyle: CSSProperties = {
    width: "5px",
    height: "5px",
    borderRadius: "50%",
    background: vs.dotColor,
    flexShrink: 0,
  };

  return (
    <span style={badgeStyle}>
      {dot && (
        <span
          style={dotStyle}
          className={variant === "ink" ? "badge-dot-pulse" : undefined}
        />
      )}
      {children}
    </span>
  );
}

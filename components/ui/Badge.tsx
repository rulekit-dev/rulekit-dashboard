"use client";

import React, { CSSProperties } from "react";

type BadgeVariant = "orange" | "green" | "blue" | "purple" | "gray";

interface BadgeProps {
  variant: BadgeVariant;
  dot?: boolean;
  pill?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, { bg: string; color: string; border: string; dotColor: string }> = {
  orange: {
    bg: "var(--orange-dim)",
    color: "var(--orange-deep)",
    border: "1.5px solid rgba(192,61,20,0.2)",
    dotColor: "var(--orange-deep)",
  },
  green: {
    bg: "var(--green-dim)",
    color: "var(--green-deep)",
    border: "1.5px solid rgba(21,128,61,0.2)",
    dotColor: "var(--green-deep)",
  },
  blue: {
    bg: "var(--blue-dim)",
    color: "#1D4ED8",
    border: "1.5px solid rgba(37,99,235,0.2)",
    dotColor: "#1D4ED8",
  },
  purple: {
    bg: "var(--purple-dim)",
    color: "#6D28D9",
    border: "1.5px solid rgba(124,58,237,0.2)",
    dotColor: "#6D28D9",
  },
  gray: {
    bg: "#EDEDEA",
    color: "#5F5E5A",
    border: "1.5px solid rgba(95,94,90,0.18)",
    dotColor: "#5F5E5A",
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
    letterSpacing: "0.04em",
    lineHeight: 1.4,
  };

  const dotStyle: CSSProperties = {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: vs.dotColor,
    flexShrink: 0,
  };

  return (
    <span style={badgeStyle}>
      {dot && (
        <span
          style={dotStyle}
          className={variant === "orange" ? "badge-dot-pulse" : undefined}
        />
      )}
      {children}
    </span>
  );
}

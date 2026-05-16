"use client";

import React, { useState, CSSProperties } from "react";

type ButtonVariant = "primary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  variant: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: "button" | "submit" | "reset";
  style?: CSSProperties;
  className?: string;
}

const sizeStyles: Record<ButtonSize, CSSProperties> = {
  sm: { padding: "5px 12px", fontSize: "12px" },
  md: { padding: "8px 16px", fontSize: "13px" },
  lg: { padding: "10px 20px", fontSize: "14px" },
};

const variantStyles: Record<ButtonVariant, CSSProperties> = {
  primary: {
    background: "var(--ink)",
    color: "var(--white)",
    borderWidth: "0",
    borderStyle: "solid",
    borderColor: "transparent",
  },
  ghost: {
    background: "transparent",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--border-med)",
    color: "var(--ink-muted)",
  },
  danger: {
    background: "transparent",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "rgba(201,42,42,0.25)",
    color: "var(--red)",
  },
};

const variantHoverStyles: Record<ButtonVariant, CSSProperties> = {
  primary: {
    opacity: 0.82,
  },
  ghost: {
    borderColor: "var(--ink)",
    color: "var(--ink)",
  },
  danger: {
    background: "var(--red-dim)",
  },
};

const spinnerStyle: CSSProperties = {
  display: "inline-block",
  width: "12px",
  height: "12px",
  border: "2px solid rgba(255,255,255,0.3)",
  borderTopColor: "currentColor",
  borderRadius: "50%",
  animation: "button-spin 0.6s linear infinite",
  marginRight: "6px",
  verticalAlign: "middle",
};

export default function Button({
  variant,
  size = "md",
  loading = false,
  disabled = false,
  children,
  onClick,
  type = "button",
  style,
  className,
}: ButtonProps) {
  const [hovered, setHovered] = useState(false);

  const isDisabled = disabled || loading;

  const baseStyle: CSSProperties = {
    fontFamily: "var(--font-sans)",
    fontWeight: 600,
    borderRadius: "8px",
    cursor: isDisabled ? "not-allowed" : "pointer",
    opacity: isDisabled ? 0.4 : 1,
    transition: "all 0.15s",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1.4,
    letterSpacing: "-0.01em",
    ...sizeStyles[size],
    ...variantStyles[variant],
    ...(hovered && !isDisabled ? variantHoverStyles[variant] : {}),
    ...style,
  };

  return (
    <>
      <style>{`@keyframes button-spin { to { transform: rotate(360deg); } }`}</style>
      <button
        type={type}
        style={baseStyle}
        disabled={isDisabled}
        onClick={onClick}
        className={className}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {loading && <span style={spinnerStyle} />}
        {children}
      </button>
    </>
  );
}

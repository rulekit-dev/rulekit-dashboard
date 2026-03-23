"use client";

import React, { useState, CSSProperties } from "react";

interface TableHeader {
  key: string;
  label: string;
  mono?: boolean;
  align?: string;
}

interface TableProps {
  headers: TableHeader[];
  children: React.ReactNode;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
}

interface TableRowProps {
  children: React.ReactNode;
  onClick?: () => void;
  style?: CSSProperties;
}

interface TableCellProps {
  children: React.ReactNode;
  primary?: boolean;
  mono?: boolean;
  align?: string;
  style?: CSSProperties;
}

export default function Table({
  headers,
  children,
  emptyMessage,
  emptyAction,
}: TableProps) {
  const wrapperStyle: CSSProperties = {
    background: "white",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    overflow: "hidden",
  };

  const tableStyle: CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
  };

  const thStyle = (header: TableHeader): CSSProperties => ({
    background: "var(--surface)",
    borderBottom: "1px solid var(--border)",
    fontWeight: 600,
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: "var(--ink-subtle)",
    padding: "10px 14px",
    textAlign: (header.align as CSSProperties["textAlign"]) || "left",
  });

  const hasChildren = React.Children.count(children) > 0;

  const emptyStyle: CSSProperties = {
    textAlign: "center",
    fontSize: "14px",
    color: "var(--ink-subtle)",
    padding: "40px",
  };

  return (
    <div style={wrapperStyle}>
      <table style={tableStyle}>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h.key} style={thStyle(h)}>
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hasChildren ? (
            children
          ) : (
            <tr>
              <td colSpan={headers.length} style={emptyStyle}>
                <div>{emptyMessage || "No data"}</div>
                {emptyAction && <div style={{ marginTop: "12px" }}>{emptyAction}</div>}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function TableRow({ children, onClick, style }: TableRowProps) {
  const [hovered, setHovered] = useState(false);

  const rowStyle: CSSProperties = {
    borderBottom: "1px solid var(--border)",
    background: hovered ? "rgba(240,90,40,0.02)" : "transparent",
    transition: "background 0.15s",
    cursor: onClick ? "pointer" : "default",
    ...style,
  };

  return (
    <tr
      style={rowStyle}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </tr>
  );
}

export function TableCell({ children, primary, mono, align, style }: TableCellProps) {
  const cellStyle: CSSProperties = {
    fontFamily: mono ? "var(--font-nunito)" : "inherit",
    fontWeight: primary ? 600 : 400,
    fontSize: mono ? "12px" : "14px",
    color: primary ? "var(--ink)" : "var(--ink-muted)",
    padding: "11px 14px",
    textAlign: (align as CSSProperties["textAlign"]) || "left",
    ...style,
  };

  return <td style={cellStyle}>{children}</td>;
}

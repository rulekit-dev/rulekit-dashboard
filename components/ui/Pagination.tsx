"use client";

import React, { CSSProperties } from "react";
import Button from "./Button";

interface PaginationProps {
  offset: number;
  limit: number;
  total: number;
  onChange: (offset: number) => void;
}

export default function Pagination({ offset, limit, total, onChange }: PaginationProps) {
  const start = total === 0 ? 0 : offset + 1;
  const end = Math.min(offset + limit, total);
  const isPrevDisabled = offset === 0;
  const isNextDisabled = offset + limit >= total;

  const containerStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
  };

  const textStyle: CSSProperties = {
    fontSize: "13px",
    color: "var(--ink-muted)",
  };

  return (
    <div style={containerStyle}>
      <Button
        variant="ghost"
        size="sm"
        disabled={isPrevDisabled}
        onClick={() => onChange(Math.max(0, offset - limit))}
      >
        Previous
      </Button>
      <span style={textStyle}>
        {start}–{end} of {total}
      </span>
      <Button
        variant="ghost"
        size="sm"
        disabled={isNextDisabled}
        onClick={() => onChange(offset + limit)}
      >
        Next
      </Button>
    </div>
  );
}

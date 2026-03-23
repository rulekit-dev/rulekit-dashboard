"use client";

import React, { useState, CSSProperties } from "react";

interface CodeBlockProps {
  code: string;
  language?: string;
}

function highlightSyntax(code: string): React.ReactNode[] {
  const tokenRegex = /("(?:[^"\\]|\\.)*")|('(?:[^'\\]|\\.)*')|(\b\d+(?:\.\d+)?\b)|(\btrue\b|\bfalse\b|\bnull\b|\bundefined\b)|([\w]+)(?=\s*:)/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      parts.push(code.slice(lastIndex, match.index));
    }

    if (match[1] || match[2]) {
      parts.push(
        <span key={match.index} style={{ color: "#FCA5A5" }}>
          {match[0]}
        </span>
      );
    } else if (match[3]) {
      parts.push(
        <span key={match.index} style={{ color: "#FCD34D" }}>
          {match[0]}
        </span>
      );
    } else if (match[4]) {
      parts.push(
        <span key={match.index} style={{ color: "#C4B5FD" }}>
          {match[0]}
        </span>
      );
    } else if (match[5]) {
      parts.push(
        <span key={match.index} style={{ color: "#93C5FD" }}>
          {match[0]}
        </span>
      );
    } else {
      parts.push(match[0]);
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < code.length) {
    parts.push(code.slice(lastIndex));
  }

  return parts;
}

export default function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const wrapperStyle: CSSProperties = {
    position: "relative",
    background: "var(--ink)",
    borderRadius: "10px",
    overflow: "hidden",
  };

  const preStyle: CSSProperties = {
    margin: 0,
    padding: "16px",
    overflowX: "auto",
  };

  const codeStyle: CSSProperties = {
    fontFamily: "var(--font-nunito)",
    fontSize: "12px",
    lineHeight: 1.6,
    color: "#E5E5E3",
  };

  const copyButtonStyle: CSSProperties = {
    position: "absolute",
    top: "8px",
    right: "8px",
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "6px",
    padding: "4px 8px",
    fontFamily: "var(--font-nunito)",
    fontSize: "11px",
    color: "rgba(255,255,255,0.6)",
    cursor: "pointer",
    transition: "all 0.2s",
  };

  return (
    <div style={wrapperStyle}>
      <button type="button" style={copyButtonStyle} onClick={handleCopy}>
        {copied ? "Copied!" : "Copy"}
      </button>
      <pre style={preStyle}>
        <code style={codeStyle}>{highlightSyntax(code)}</code>
      </pre>
    </div>
  );
}

"use client";

import { useState } from "react";
import type { Version } from "@/lib/types";

interface CliQuickstartProps {
  workspace: string;
  versions: Map<string, Version[]>;
}

export default function CliQuickstart({ workspace, versions }: CliQuickstartProps) {
  let latestKey = "your-ruleset-key";
  let latestTime = 0;
  versions.forEach((vList, key) => {
    for (const v of vList) {
      const t = new Date(v.created_at).getTime();
      if (t > latestTime) { latestTime = t; latestKey = key; }
    }
  });

  const lines = [
    { prefix: "#", text: " install the CLI", dim: true },
    { prefix: "$", text: ` npm install -g @rulekit/cli`, dim: false },
    { prefix: "", text: "", dim: false },
    { prefix: "#", text: " pull latest rules", dim: true },
    { prefix: "$", text: ` rulekit pull --workspace ${workspace} \\`, dim: false },
    { prefix: " ", text: `  --key ${latestKey}`, dim: false },
  ];

  return (
    <div style={{
      background: "var(--white)",
      borderRadius: "12px",
      border: "1px solid var(--border)",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "20px 22px 16px",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em" }}>
          Pull rules into your project
        </div>
        <div style={{ fontSize: 11, color: "var(--ink-subtle)", marginTop: 1 }}>
          Run this in your application repo to fetch the latest rules.
        </div>
      </div>

      {/* Terminal block */}
      <div style={{
        margin: "16px 22px 0",
        borderRadius: 8,
        background: "var(--ink)",
        border: "1px solid rgba(255,255,255,0.06)",
        overflow: "hidden",
        flexShrink: 0,
      }}>
        {/* Terminal chrome */}
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "8px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.03)",
        }}>
          {["#FF5F56", "#FFBD2E", "#27C93F"].map((c) => (
            <div key={c} style={{ width: 8, height: 8, borderRadius: "50%", background: c, opacity: 0.7 }} />
          ))}
          <span style={{
            marginLeft: 6, fontFamily: "var(--font-sans)", fontSize: 9,
            color: "rgba(255,255,255,0.25)", letterSpacing: "0.04em",
          }}>
            terminal
          </span>
        </div>

        {/* Code lines */}
        <div style={{ padding: "14px 16px 16px" }}>
          {lines.map((line, i) => (
            <div key={i} style={{ display: "flex", lineHeight: "1.7", minHeight: line.text === "" ? 8 : undefined }}>
              {line.text !== "" && (
                <>
                  <span style={{
                    fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500,
                    color: line.prefix === "#" ? "rgba(255,255,255,0.2)"
                      : line.prefix === "$" ? "rgba(74,222,128,0.8)"
                      : "transparent",
                    flexShrink: 0, width: 12, userSelect: "none",
                  }}>
                    {line.prefix}
                  </span>
                  <span style={{
                    fontFamily: "var(--font-sans)", fontSize: 12,
                    color: line.dim ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.82)",
                    marginLeft: 4,
                  }}>
                    {line.text}
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Links */}
      <div style={{ display: "flex", gap: 4, padding: "14px 22px 20px", marginTop: "auto" }}>
        <TermLink href="https://docs.rulekit.dev" label="Install CLI →" />
        <span style={{ color: "var(--border-med)", fontSize: 11 }}>·</span>
        <TermLink href={`/${workspace}/rulesets`} label="View rulesets →" />
      </div>
    </div>
  );
}

function TermLink({ href, label }: { href: string; label: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
      style={{
        fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 500,
        color: hovered ? "var(--ink)" : "var(--ink-muted)",
        textDecoration: "none", transition: "color 0.15s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {label}
    </a>
  );
}

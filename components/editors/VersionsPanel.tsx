"use client";

import React, { useState, useEffect, CSSProperties } from "react";
import { Clock, Hash, CheckCircle } from "lucide-react";
import type { Version } from "@/lib/types";
import * as api from "@/lib/api";

interface VersionsPanelProps {
  workspace: string;
  rulesetKey: string;
}

export default function VersionsPanel({ workspace, rulesetKey }: VersionsPanelProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .listVersions(workspace, rulesetKey)
      .then((res) => {
        const data = Array.isArray(res) ? res : res.data || [];
        setVersions(data);
      })
      .catch((err) => {
        setError(err.message || "Failed to load versions");
      })
      .finally(() => setLoading(false));
  }, [workspace, rulesetKey]);

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={emptyStyle}>Loading versions…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={containerStyle}>
        <div style={{ ...emptyStyle, color: "#DC2626" }}>{error}</div>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div style={containerStyle}>
        <div style={emptyStyle}>No published versions yet. Use the Publish button to create your first version.</div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={listStyle}>
        {versions.map((v, idx) => (
          <div
            key={v.version}
            style={itemStyle}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--surface)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <div style={itemLeftStyle}>
              <div style={versionBadgeStyle}>
                <Hash size={12} />
                <span style={versionNumStyle}>v{v.version}</span>
                {idx === 0 && (
                  <span style={latestBadgeStyle}>
                    <CheckCircle size={10} />
                    latest
                  </span>
                )}
              </div>
              <div style={metaRowStyle}>
                <Clock size={11} style={{ flexShrink: 0, opacity: 0.5 }} />
                <span>{formatDate(v.created_at)}</span>
              </div>
            </div>
            <div style={checksumStyle} title={v.checksum}>
              {v.checksum.slice(0, 8)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const containerStyle: CSSProperties = {
  padding: "24px 32px",
  overflow: "auto",
  height: "100%",
  boxSizing: "border-box",
};

const listStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 0,
  background: "var(--white)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  overflow: "hidden",
};

const itemStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 16px",
  borderBottom: "1px solid var(--border)",
  transition: "background 0.1s",
  cursor: "default",
};

const itemLeftStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const versionBadgeStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  color: "var(--ink)",
};

const versionNumStyle: CSSProperties = {
  fontFamily: "var(--font-nunito)",
  fontSize: 14,
  fontWeight: 700,
  color: "var(--ink)",
};

const latestBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 3,
  fontFamily: "var(--font-nunito)",
  fontSize: 10,
  fontWeight: 600,
  color: "var(--green-deep)",
  background: "var(--green-dim)",
  padding: "1px 6px",
  borderRadius: 4,
  marginLeft: 6,
};

const metaRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  fontFamily: "var(--font-nunito)",
  fontSize: 11,
  color: "var(--ink-subtle)",
};

const checksumStyle: CSSProperties = {
  fontFamily: "var(--font-dm-mono)",
  fontSize: 11,
  color: "var(--ink-subtle)",
  background: "var(--surface)",
  padding: "2px 8px",
  borderRadius: 4,
};

const emptyStyle: CSSProperties = {
  fontFamily: "var(--font-nunito)",
  fontSize: 13,
  color: "var(--ink-subtle)",
  textAlign: "center",
  padding: "40px 20px",
};

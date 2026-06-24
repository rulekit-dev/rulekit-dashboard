"use client";

import React, { useState, useEffect, useCallback, CSSProperties } from "react";
import { Clock, Hash, CheckCircle, RotateCcw, GitCompare, X } from "lucide-react";
import type { Version, Draft } from "@/lib/types";
import * as api from "@/lib/api";

interface VersionsPanelProps {
  workspace: string;
  rulesetKey: string;
  canEdit: boolean;
  dirty?: boolean;
  onRollback?: (draft: Draft, version: number) => void;
}

export default function VersionsPanel({ workspace, rulesetKey, canEdit, dirty, onRollback }: VersionsPanelProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rollingBack, setRollingBack] = useState<number | null>(null);
  const [diffVersions, setDiffVersions] = useState<[number, number] | null>(null);

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

  const handleRollback = useCallback(async (version: number) => {
    if (dirty) {
      const confirmed = window.confirm(
        `You have unsaved changes. Rolling back to v${version} will replace your current draft. Continue?`
      );
      if (!confirmed) return;
    }
    setRollingBack(version);
    try {
      const draft = await api.rollbackRuleset(workspace, rulesetKey, version);
      onRollback?.(draft, version);
    } catch (err: unknown) {
      const e = err as { message?: string };
      alert(`Rollback failed: ${e.message || "unknown error"}`);
    } finally {
      setRollingBack(null);
    }
  }, [workspace, rulesetKey, dirty, onRollback]);

  const handleDiff = useCallback((version: number) => {
    const latest = versions[0]?.version;
    if (latest == null) return;
    setDiffVersions([version, latest]);
  }, [versions]);

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
      {diffVersions && (
        <DiffView
          workspace={workspace}
          rulesetKey={rulesetKey}
          fromVersion={diffVersions[0]}
          toVersion={diffVersions[1]}
          onClose={() => setDiffVersions(null)}
        />
      )}

      {!diffVersions && (
        <div style={listStyle}>
          {versions.map((v, idx) => {
            const isLatest = idx === 0;
            const isRollingBack = rollingBack === v.version;
            return (
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
                    {isLatest && (
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
                <div style={itemRightStyle}>
                  <div style={checksumStyle} title={v.checksum}>
                    {v.checksum.slice(0, 8)}
                  </div>
                  <div style={actionButtonsStyle}>
                    {!isLatest && (
                      <button
                        style={actionBtnStyle}
                        title={`Diff v${v.version} vs v${versions[0].version}`}
                        onClick={() => handleDiff(v.version)}
                      >
                        <GitCompare size={13} />
                        <span>Diff</span>
                      </button>
                    )}
                    {canEdit && !isLatest && (
                      <button
                        style={{ ...actionBtnStyle, ...(isRollingBack ? actionBtnDisabledStyle : {}) }}
                        title={`Restore v${v.version} as draft`}
                        disabled={isRollingBack}
                        onClick={() => handleRollback(v.version)}
                      >
                        <RotateCcw size={13} />
                        <span>{isRollingBack ? "Rolling back…" : "Rollback"}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface DiffViewProps {
  workspace: string;
  rulesetKey: string;
  fromVersion: number;
  toVersion: number;
  onClose: () => void;
}

function DiffView({ workspace, rulesetKey, fromVersion, toVersion, onClose }: DiffViewProps) {
  const [fromDSL, setFromDSL] = useState<string | null>(null);
  const [toDSL, setToDSL] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    setFromDSL(null);
    setToDSL(null);
    setLoadErr(null);
    Promise.all([
      api.getVersion(workspace, rulesetKey, fromVersion),
      api.getVersion(workspace, rulesetKey, toVersion),
    ])
      .then(([from, to]) => {
        setFromDSL(JSON.stringify(from.dsl, null, 2));
        setToDSL(JSON.stringify(to.dsl, null, 2));
      })
      .catch((err: unknown) => {
        const e = err as { message?: string };
        setLoadErr(e.message || "Failed to load versions");
      });
  }, [workspace, rulesetKey, fromVersion, toVersion]);

  const diffLines = fromDSL && toDSL ? computeDiff(fromDSL, toDSL) : null;

  return (
    <div style={diffContainerStyle}>
      <div style={diffHeaderStyle}>
        <span style={diffTitleStyle}>
          Diff: <strong>v{fromVersion}</strong> → <strong>v{toVersion}</strong>
        </span>
        <button style={diffCloseBtnStyle} onClick={onClose} title="Close diff">
          <X size={14} />
        </button>
      </div>

      {loadErr && (
        <div style={{ padding: "20px 24px", color: "#DC2626", fontFamily: "var(--font-sans)", fontSize: 13 }}>
          {loadErr}
        </div>
      )}

      {!diffLines && !loadErr && (
        <div style={{ padding: "20px 24px", fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--ink-subtle)" }}>
          Loading…
        </div>
      )}

      {diffLines && (
        <div style={diffBodyStyle}>
          <div style={diffColStyle}>
            <div style={diffColHeaderStyle}>v{fromVersion}</div>
            <pre style={diffPreStyle}>
              {diffLines.map((line, i) => (
                <div
                  key={i}
                  style={{
                    ...diffLineStyle,
                    background: line.type === "removed" ? "rgba(220,38,38,0.08)" : "transparent",
                    color: line.type === "removed" ? "#B91C1C" : "var(--ink-muted)",
                  }}
                >
                  {line.type === "removed" ? "− " : "  "}
                  {line.from ?? ""}
                </div>
              ))}
            </pre>
          </div>
          <div style={{ ...diffColStyle, borderLeft: "1px solid var(--border)" }}>
            <div style={diffColHeaderStyle}>v{toVersion} (latest)</div>
            <pre style={diffPreStyle}>
              {diffLines.map((line, i) => (
                <div
                  key={i}
                  style={{
                    ...diffLineStyle,
                    background: line.type === "added" ? "rgba(22,163,74,0.08)" : "transparent",
                    color: line.type === "added" ? "#15803D" : "var(--ink-muted)",
                  }}
                >
                  {line.type === "added" ? "+ " : "  "}
                  {line.to ?? ""}
                </div>
              ))}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

interface DiffLine {
  type: "same" | "removed" | "added";
  from?: string;
  to?: string;
}

function computeDiff(fromText: string, toText: string): DiffLine[] {
  const fromLines = fromText.split("\n");
  const toLines = toText.split("\n");

  // LCS-based line diff
  const m = fromLines.length;
  const n = toLines.length;

  // Build LCS table (bounded to avoid O(m*n) on huge DSLs)
  const MAX = 500;
  if (m > MAX || n > MAX) {
    // For very large DSLs just show them side by side without diffing
    const maxLen = Math.max(m, n);
    const lines: DiffLine[] = [];
    for (let i = 0; i < maxLen; i++) {
      const f = fromLines[i];
      const t = toLines[i];
      if (f === t) {
        lines.push({ type: "same", from: f, to: t });
      } else {
        if (f !== undefined) lines.push({ type: "removed", from: f, to: undefined });
        if (t !== undefined) lines.push({ type: "added", from: undefined, to: t });
      }
    }
    return lines;
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (fromLines[i] === toLines[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const result: DiffLine[] = [];
  let i = 0, j = 0;
  while (i < m || j < n) {
    if (i < m && j < n && fromLines[i] === toLines[j]) {
      result.push({ type: "same", from: fromLines[i], to: toLines[j] });
      i++; j++;
    } else if (j < n && (i >= m || dp[i][j + 1] >= dp[i + 1][j])) {
      result.push({ type: "added", from: undefined, to: toLines[j] });
      j++;
    } else {
      result.push({ type: "removed", from: fromLines[i], to: undefined });
      i++;
    }
  }
  return result;
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

const itemRightStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const versionBadgeStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  color: "var(--ink)",
};

const versionNumStyle: CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 14,
  fontWeight: 700,
  color: "var(--ink)",
};

const latestBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 3,
  fontFamily: "var(--font-sans)",
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
  fontFamily: "var(--font-sans)",
  fontSize: 11,
  color: "var(--ink-subtle)",
};

const checksumStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--ink-subtle)",
  background: "var(--surface)",
  padding: "2px 8px",
  borderRadius: 4,
};

const actionButtonsStyle: CSSProperties = {
  display: "flex",
  gap: 4,
};

const actionBtnStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  background: "none",
  border: "1px solid var(--border)",
  borderRadius: 5,
  padding: "3px 8px",
  fontSize: 11,
  fontFamily: "var(--font-sans)",
  color: "var(--ink-muted)",
  cursor: "pointer",
  transition: "background 0.1s, color 0.1s",
};

const actionBtnDisabledStyle: CSSProperties = {
  opacity: 0.5,
  cursor: "not-allowed",
};

const emptyStyle: CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  color: "var(--ink-subtle)",
  textAlign: "center",
  padding: "40px 20px",
};

const diffContainerStyle: CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 10,
  overflow: "hidden",
  background: "var(--white)",
};

const diffHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px 16px",
  borderBottom: "1px solid var(--border)",
  background: "var(--surface)",
};

const diffTitleStyle: CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 12,
  color: "var(--ink-muted)",
};

const diffCloseBtnStyle: CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "var(--ink-subtle)",
  display: "flex",
  alignItems: "center",
  padding: 2,
};

const diffBodyStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  overflow: "auto",
  maxHeight: 480,
};

const diffColStyle: CSSProperties = {
  overflow: "auto",
};

const diffColHeaderStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--ink-subtle)",
  padding: "6px 12px",
  borderBottom: "1px solid var(--border)",
  background: "var(--surface)",
  position: "sticky",
  top: 0,
};

const diffPreStyle: CSSProperties = {
  margin: 0,
  padding: 0,
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  lineHeight: 1.6,
  overflow: "visible",
};

const diffLineStyle: CSSProperties = {
  padding: "0 12px",
  whiteSpace: "pre",
  minHeight: "1.6em",
};

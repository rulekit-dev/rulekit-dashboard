"use client";

import { useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import type { Ruleset, Version } from "@/lib/types";

interface RulesetHealthProps {
  workspace: string;
  rulesets: Ruleset[];
  versions: Map<string, Version[]>;
  draftsSet: Set<string>;
  loading: boolean;
}

type HealthStatus = "published" | "draft" | "never";

function getStatus(key: string, versions: Map<string, Version[]>, draftsSet: Set<string>): HealthStatus {
  const vList = versions.get(key);
  const hasPublished = vList && vList.length > 0;
  const hasDraft = draftsSet.has(key);
  if (hasPublished && !hasDraft) return "published";
  if (hasDraft) return "draft";
  return "never";
}

const statusMeta: Record<HealthStatus, { label: string; color: string; bg: string; border: string }> = {
  published: { label: "published", color: "var(--green)", bg: "rgba(26,127,75,0.1)", border: "rgba(26,127,75,0.2)" },
  draft:     { label: "draft",     color: "var(--amber)", bg: "rgba(180,83,9,0.1)",  border: "rgba(180,83,9,0.2)" },
  never:     { label: "unpublished", color: "var(--ink-subtle)", bg: "rgba(28,28,26,0.05)", border: "rgba(28,28,26,0.1)" },
};

export default function RulesetHealth({ workspace, rulesets, versions, draftsSet, loading }: RulesetHealthProps) {
  const [showAll, setShowAll] = useState(false);
  const maxVisible = 6;
  const visible = showAll ? rulesets : rulesets.slice(0, maxVisible);

  const publishedCount = rulesets.filter(rs => getStatus(rs.key, versions, draftsSet) === "published").length;
  const draftCount = rulesets.filter(rs => getStatus(rs.key, versions, draftsSet) === "draft").length;
  const neverCount = rulesets.filter(rs => getStatus(rs.key, versions, draftsSet) === "never").length;

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
        padding: "20px 22px",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
        minHeight: 64,
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em" }}>
            Ruleset health
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-subtle)", marginTop: 2 }}>
            Draft and publish status
          </div>
        </div>

        {/* Summary pills */}
        {!loading && rulesets.length > 0 && (
          <div style={{ display: "flex", gap: 5 }}>
            {publishedCount > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 600,
                color: "var(--green)", background: "rgba(26,127,75,0.08)",
                border: "1px solid rgba(26,127,75,0.18)", borderRadius: 5, padding: "3px 8px",
              }}>
                {publishedCount} live
              </span>
            )}
            {draftCount > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 600,
                color: "var(--amber)", background: "rgba(180,83,9,0.08)",
                border: "1px solid rgba(180,83,9,0.18)", borderRadius: 5, padding: "3px 8px",
              }}>
                {draftCount} draft
              </span>
            )}
          </div>
        )}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ padding: "14px 22px", borderBottom: "1px solid var(--border)" }}>
                <Skeleton width="100%" height="32px" />
              </div>
            ))}
          </div>
        ) : rulesets.length === 0 ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: "48px 24px", gap: 8,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "var(--surface)", border: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="4" width="12" height="9" rx="2" stroke="var(--ink-subtle)" strokeWidth="1.5" />
                <path d="M5 4V3a3 3 0 016 0v1" stroke="var(--ink-subtle)" strokeWidth="1.5" />
              </svg>
            </div>
            <span style={{ fontSize: 12, color: "var(--ink-subtle)" }}>No rulesets in this workspace</span>
          </div>
        ) : (
          <>
            {visible.map((rs, i) => {
              const status = getStatus(rs.key, versions, draftsSet);
              const vList = versions.get(rs.key);
              const latestVersion = vList && vList.length > 0 ? Math.max(...vList.map(v => v.version)) : null;
              return (
                <HealthRow
                  key={rs.key}
                  workspace={workspace}
                  ruleset={rs}
                  status={status}
                  latestVersion={latestVersion}
                  isLast={i === visible.length - 1 && (showAll || rulesets.length <= maxVisible)}
                  index={i}
                />
              );
            })}
            {!showAll && rulesets.length > maxVisible && (
              <div style={{ padding: "12px 22px" }}>
                <Button variant="ghost" size="sm" onClick={() => setShowAll(true)}>
                  View all {rulesets.length} rulesets →
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function HealthRow({ workspace, ruleset, status, latestVersion, isLast, index }: {
  workspace: string; ruleset: Ruleset; status: HealthStatus;
  latestVersion: number | null; isLast: boolean; index: number;
}) {
  const [hovered, setHovered] = useState(false);
  const meta = statusMeta[status];

  return (
    <Link
      href={`/${workspace}/rulesets/${ruleset.key}`}
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="animate-row"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 22px",
          borderBottom: isLast ? "none" : "1px solid var(--border)",
          background: hovered ? "var(--surface)" : "transparent",
          transition: "background 0.12s",
          animationDelay: `${index * 60}ms`,
        }}
      >
        {/* Status indicator */}
        <div style={{
          width: 8, height: 8, borderRadius: "50%",
          background: meta.color,
          boxShadow: status === "published" ? "0 0 0 3px rgba(26,127,75,0.12)"
            : status === "draft" ? "0 0 0 3px rgba(180,83,9,0.12)" : "none",
          flexShrink: 0,
        }} />

        {/* Name + key */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 600, color: "var(--ink)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {ruleset.name}
          </div>
          <div style={{
            fontFamily: "var(--font-sans)", fontWeight: 400, fontSize: 10, color: "var(--ink-subtle)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {ruleset.key}
          </div>
        </div>

        {/* Badges */}
        <div style={{ display: "flex", gap: 5, flexShrink: 0, alignItems: "center" }}>
          {latestVersion !== null && (
            <span style={{
              fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 500,
              color: "var(--ink-muted)", background: "var(--surface)",
              border: "1px solid var(--border)", borderRadius: 4, padding: "1px 5px",
            }}>
              v{latestVersion}
            </span>
          )}
          <span style={{
            fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 500,
            color: meta.color, background: meta.bg,
            border: `1px solid ${meta.border}`, borderRadius: 4, padding: "1px 6px",
          }}>
            {meta.label}
          </span>
        </div>
      </div>
    </Link>
  );
}

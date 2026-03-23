"use client";

import { useState } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
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

function getStatus(
  key: string,
  versions: Map<string, Version[]>,
  draftsSet: Set<string>
): HealthStatus {
  const vList = versions.get(key);
  const hasPublished = vList && vList.length > 0;
  const hasDraft = draftsSet.has(key);

  if (hasPublished && !hasDraft) return "published";
  if (hasDraft) return "draft";
  return "never";
}

const statusConfig: Record<HealthStatus, { dotColor: string }> = {
  published: { dotColor: "var(--green)" },
  draft: { dotColor: "var(--orange)" },
  never: { dotColor: "var(--ink-subtle)" },
};

export default function RulesetHealth({
  workspace,
  rulesets,
  versions,
  draftsSet,
  loading,
}: RulesetHealthProps) {
  const [showAll, setShowAll] = useState(false);
  const maxVisible = 6;
  const visible = showAll ? rulesets : rulesets.slice(0, maxVisible);

  return (
    <div
      style={{
        background: "var(--white)",
        borderRadius: "12px",
        border: "1px solid var(--border)",
        padding: "24px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--ink)" }}>
          Ruleset health
        </div>
        <div style={{ fontSize: "13px", fontWeight: 400, color: "var(--ink-muted)" }}>
          Draft and publish status
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", maxHeight: "260px" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} width="100%" height="44px" />
            ))}
          </div>
        ) : rulesets.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "48px 0",
              fontSize: "14px",
              fontWeight: 400,
              color: "var(--ink-subtle)",
            }}
          >
            No rulesets in this workspace.
          </div>
        ) : (
          <>
            {visible.map((rs, i) => {
              const status = getStatus(rs.key, versions, draftsSet);
              const vList = versions.get(rs.key);
              const latestVersion = vList && vList.length > 0
                ? Math.max(...vList.map((v) => v.version))
                : null;

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
              <div style={{ paddingTop: "12px" }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAll(true)}
                >
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

function HealthRow({
  workspace,
  ruleset,
  status,
  latestVersion,
  isLast,
  index,
}: {
  workspace: string;
  ruleset: Ruleset;
  status: HealthStatus;
  latestVersion: number | null;
  isLast: boolean;
  index: number;
}) {
  const [hovered, setHovered] = useState(false);
  const cfg = statusConfig[status];

  return (
    <Link
      href={`/${workspace}/rulesets/${ruleset.key}`}
      style={{ textDecoration: "none", color: "inherit" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="animate-row"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "10px 4px",
          borderBottom: isLast ? "none" : "1px solid var(--border)",
          background: hovered ? "rgba(28,28,26,0.02)" : "transparent",
          borderRadius: "4px",
          transition: "background 0.15s",
          animationDelay: `${index * 100}ms`,
        }}
      >
        {/* Status dot */}
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: cfg.dotColor,
            flexShrink: 0,
          }}
        />

        {/* Name + key */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--ink)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {ruleset.name}
          </div>
          <div
            style={{
              fontFamily: "var(--font-dm-mono)",
              fontWeight: 400,
              fontSize: "12px",
              color: "var(--ink-muted)",
            }}
          >
            {ruleset.key}
          </div>
        </div>

        {/* Badges */}
        <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
          {latestVersion !== null && (
            <Badge variant="gray">v{latestVersion}</Badge>
          )}
          {status === "draft" && (
            <Badge variant="orange">draft</Badge>
          )}
          {status === "never" && (
            <span
              style={{
                fontSize: "11px",
                fontStyle: "italic",
                color: "var(--ink-subtle)",
              }}
            >
              never published
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

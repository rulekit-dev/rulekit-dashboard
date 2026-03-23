"use client";

import Link from "next/link";
import { useState } from "react";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import { relativeTime } from "@/lib/utils/relativeTime";
import type { Version } from "@/lib/types";

interface ActivityFeedProps {
  versions: { version: Version; workspace: string }[];
  loading: boolean;
}

export default function ActivityFeed({ versions, loading }: ActivityFeedProps) {
  const sorted = [...versions]
    .sort((a, b) => new Date(b.version.created_at).getTime() - new Date(a.version.created_at).getTime())
    .slice(0, 10);

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
          Recent activity
        </div>
        <div style={{ fontSize: "13px", fontWeight: 400, color: "var(--ink-muted)" }}>
          Latest publishes across all rulesets
        </div>
      </div>

      {/* Feed */}
      <div style={{ flex: 1, overflowY: "auto", maxHeight: "260px" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} width="100%" height="44px" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "48px 0",
              fontSize: "14px",
              fontWeight: 400,
              color: "var(--ink-subtle)",
            }}
          >
            No publishes yet.
          </div>
        ) : (
          sorted.map((item, i) => (
            <FeedItem
              key={`${item.version.ruleset_key}-${item.version.version}`}
              version={item.version}
              workspace={item.workspace}
              isLast={i === sorted.length - 1}
              index={i}
            />
          ))
        )}
      </div>
    </div>
  );
}

function FeedItem({
  version,
  workspace,
  isLast,
  index,
}: {
  version: Version;
  workspace: string;
  isLast: boolean;
  index: number;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={`/${workspace}/rulesets/${version.ruleset_key}`}
      style={{ textDecoration: "none", color: "inherit" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="animate-row"
        style={{
          padding: "10px 4px",
          borderBottom: isLast ? "none" : "1px solid var(--border)",
          background: hovered ? "rgba(28,28,26,0.02)" : "transparent",
          borderRadius: "4px",
          transition: "background 0.15s",
          animationDelay: `${index * 100}ms`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          {/* Green dot */}
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--green)",
              flexShrink: 0,
            }}
          />
          {/* Key */}
          <span
            style={{
              fontFamily: "var(--font-dm-mono)",
              fontWeight: 500,
              fontSize: "13px",
              color: "var(--ink)",
            }}
          >
            {version.ruleset_key}
          </span>
          {/* Version badge */}
          <Badge variant="gray">v{version.version}</Badge>
          {/* Time */}
          <span
            style={{
              marginLeft: "auto",
              fontFamily: "var(--font-dm-mono)",
              fontWeight: 400,
              fontSize: "11px",
              color: "var(--ink-subtle)",
              flexShrink: 0,
            }}
          >
            {relativeTime(version.created_at)}
          </span>
        </div>
        <div
          style={{
            fontSize: "12px",
            fontWeight: 400,
            color: "var(--ink-muted)",
            paddingLeft: "18px",
            marginTop: "2px",
          }}
        >
          {workspace} workspace
        </div>
      </div>
    </Link>
  );
}

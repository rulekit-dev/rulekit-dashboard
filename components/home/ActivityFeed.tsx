"use client";

import Link from "next/link";
import { useState } from "react";
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
            Recent activity
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-subtle)", marginTop: 2 }}>
            Latest publishes across all rulesets
          </div>
        </div>
        {!loading && sorted.length > 0 && (
          <div style={{
            fontSize: 10, fontWeight: 600,
            color: "var(--ink-subtle)",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 5, padding: "3px 8px",
          }}>
            {sorted.length} events
          </div>
        )}
      </div>

      {/* Feed */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} style={{ padding: "14px 22px", borderBottom: "1px solid var(--border)" }}>
                <Skeleton width="100%" height="32px" />
              </div>
            ))}
          </div>
        ) : sorted.length === 0 ? (
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
                <circle cx="8" cy="8" r="6" stroke="var(--ink-subtle)" strokeWidth="1.5" />
                <path d="M8 5v3.5l2 2" stroke="var(--ink-subtle)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <span style={{ fontSize: 12, color: "var(--ink-subtle)" }}>No publishes yet</span>
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

function FeedItem({ version, workspace, isLast, index }: {
  version: Version; workspace: string; isLast: boolean; index: number;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={`/${workspace}/rulesets/${version.ruleset_key}`}
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="animate-row"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "13px 22px",
          borderBottom: isLast ? "none" : "1px solid var(--border)",
          background: hovered ? "var(--surface)" : "transparent",
          transition: "background 0.12s",
          animationDelay: `${index * 60}ms`,
        }}
      >
        {/* Timeline dot */}
        <div style={{
          width: 8, height: 8, borderRadius: "50%",
          background: "var(--green)",
          boxShadow: "0 0 0 3px rgba(26,127,75,0.12)",
          flexShrink: 0,
        }} />

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: 12,
              color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {version.ruleset_key}
            </span>
            <span style={{
              fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 500,
              color: "var(--green)", background: "rgba(26,127,75,0.1)",
              border: "1px solid rgba(26,127,75,0.2)", borderRadius: 4,
              padding: "1px 5px", flexShrink: 0,
            }}>
              v{version.version}
            </span>
          </div>
          <div style={{ fontSize: 10, color: "var(--ink-subtle)", marginTop: 1 }}>
            published · {workspace}
          </div>
        </div>

        {/* Time */}
        <span style={{
          fontFamily: "var(--font-sans)", fontSize: 10, color: "var(--ink-subtle)",
          flexShrink: 0,
        }}>
          {relativeTime(version.created_at)}
        </span>
      </div>
    </Link>
  );
}

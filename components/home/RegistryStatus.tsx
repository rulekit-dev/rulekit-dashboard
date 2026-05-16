"use client";

import { useEffect, useState, useCallback } from "react";
import Skeleton from "@/components/ui/Skeleton";
import { getHealth, type HealthResponse } from "@/lib/api";
import { relativeTime } from "@/lib/utils/relativeTime";

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  if (h < 24) return `${h}h ${rm}m`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return `${d}d ${rh}h`;
}

interface HealthState {
  data: HealthResponse | null;
  responseTimeMs: number;
  error: boolean;
  loading: boolean;
  lastChecked: string | null;
}

export default function RegistryStatus() {
  const [state, setState] = useState<HealthState>({
    data: null, responseTimeMs: 0, error: false, loading: true, lastChecked: null,
  });

  const fetchHealth = useCallback(async () => {
    try {
      const result = await getHealth();
      setState({ data: result.data, responseTimeMs: result.responseTimeMs, error: false, loading: false, lastChecked: new Date().toISOString() });
    } catch {
      setState((prev) => ({ ...prev, error: true, loading: false, lastChecked: new Date().toISOString() }));
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const responseMs = state.responseTimeMs;
  const responseTier = responseMs < 100 ? "fast" : responseMs <= 500 ? "ok" : "slow";
  const responseColor = responseTier === "fast" ? "#1A7F4B" : responseTier === "ok" ? "#B45309" : "#DC2626";
  const responseBg = responseTier === "fast" ? "rgba(26,127,75,0.09)" : responseTier === "ok" ? "rgba(180,83,9,0.09)" : "rgba(220,38,38,0.09)";
  const responseBorder = responseTier === "fast" ? "rgba(26,127,75,0.2)" : responseTier === "ok" ? "rgba(180,83,9,0.2)" : "rgba(220,38,38,0.2)";

  return (
    <div style={{
      background: "var(--white)",
      borderRadius: 12,
      border: "1px solid var(--border)",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Header — white, same structure as sibling cards */}
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
            Registry status
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-subtle)", marginTop: 2 }}>
            Live health of the rulekit registry
          </div>
        </div>

        {/* Status badge */}
        {!state.loading && (
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            background: state.error ? "rgba(220,38,38,0.07)" : "rgba(26,127,75,0.07)",
            border: `1px solid ${state.error ? "rgba(220,38,38,0.2)" : "rgba(26,127,75,0.2)"}`,
            borderRadius: 6, padding: "4px 10px",
          }}>
            <div style={{ position: "relative", width: 8, height: 8, flexShrink: 0 }}>
              <div style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                background: state.error ? "#DC2626" : "#4ade80",
                opacity: 0.35,
                animation: state.error ? "none" : "rs-pulse 2s ease-in-out infinite",
              }} />
              <div style={{ position: "absolute", inset: 2, borderRadius: "50%", background: state.error ? "#DC2626" : "#22c55e" }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: state.error ? "#DC2626" : "#1A7F4B" }}>
              {state.error ? "Unreachable" : "Operational"}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      {state.loading ? (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ padding: "14px 22px", borderBottom: "1px solid var(--border)" }}>
              <Skeleton width="100%" height="16px" />
            </div>
          ))}
        </div>
      ) : state.error ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "40px 24px", gap: 8,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="#DC2626" strokeWidth="1.5" />
              <path d="M8 5v4M8 11v.5" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>Could not connect to registry</span>
        </div>
      ) : (
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: 10, padding: "14px 16px",
        }}>
          <MetricTile label="Version" value={state.data!.version} />
          <MetricTile label="Store" value={state.data!.store} />
          <MetricTile label="Uptime" value={formatUptime(state.data!.uptime_seconds)} />
          <MetricTile
            label="Response"
            value={`${responseMs}ms`}
            valueColor={responseColor}
            valueBg={responseBg}
            valueBorder={responseBorder}
          />
        </div>
      )}

      {/* Footer */}
      {state.lastChecked && (
        <div style={{
          padding: "9px 22px 12px",
          borderTop: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginTop: "auto", flexShrink: 0,
        }}>
          <span style={{ fontSize: 10, color: "var(--ink-subtle)" }}>
            Checked {relativeTime(state.lastChecked)}
          </span>
          <button
            onClick={fetchHealth}
            style={{
              fontSize: 10, fontWeight: 600, color: "var(--ink-muted)",
              background: "none", border: "none", cursor: "pointer", padding: 0,
              transition: "color 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--ink)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--ink-muted)")}
          >
            Refresh
          </button>
        </div>
      )}

      <style>{`
        @keyframes rs-pulse {
          0%, 100% { transform: scale(1); opacity: 0.35; }
          50% { transform: scale(2.4); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function MetricTile({ label, value, valueColor, valueBg, valueBorder }: {
  label: string; value: string;
  valueColor?: string; valueBg?: string; valueBorder?: string;
}) {
  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 9,
      padding: "12px 14px",
      display: "flex", flexDirection: "column", gap: 6,
    }}>
      <span style={{
        fontSize: 9, fontWeight: 600, textTransform: "uppercase",
        letterSpacing: "0.07em", color: "var(--ink-subtle)",
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 15, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1,
        color: valueColor || "var(--ink)",
        background: valueBg,
        border: valueBorder ? `1px solid ${valueBorder}` : "none",
        borderRadius: valueBg ? 5 : 0,
        padding: valueBg ? "2px 6px" : 0,
        alignSelf: "flex-start",
      }}>
        {value}
      </span>
    </div>
  );
}

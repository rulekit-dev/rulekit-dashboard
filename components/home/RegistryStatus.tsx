"use client";

import { useEffect, useState, useCallback } from "react";
import Badge from "@/components/ui/Badge";
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

function responseColor(ms: number): string {
  if (ms < 100) return "var(--green)";
  if (ms <= 500) return "var(--orange)";
  return "#DC2626";
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
    data: null,
    responseTimeMs: 0,
    error: false,
    loading: true,
    lastChecked: null,
  });

  const fetchHealth = useCallback(async () => {
    try {
      const result = await getHealth();
      setState({
        data: result.data,
        responseTimeMs: result.responseTimeMs,
        error: false,
        loading: false,
        lastChecked: new Date().toISOString(),
      });
    } catch {
      setState((prev) => ({
        ...prev,
        error: true,
        loading: false,
        lastChecked: new Date().toISOString(),
      }));
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

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
      <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--ink)", marginBottom: "16px" }}>
        Registry status
      </div>

      {state.loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} width="100%" height="20px" />
          ))}
        </div>
      ) : state.error ? (
        <div>
          <div style={{ marginBottom: "12px" }}>
            <Badge variant="orange" dot>Unreachable</Badge>
          </div>
          <div style={{ fontSize: "13px", color: "var(--ink-muted)" }}>
            Could not connect to registry
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0, flex: 1 }}>
          <StatusRow label="Status" isLast={false}>
            <Badge variant="green" dot>{state.data!.status === "ok" ? "Operational" : "Degraded"}</Badge>
          </StatusRow>
          <StatusRow label="Version" isLast={false}>
            <span
              style={{
                fontFamily: "var(--font-dm-mono)",
                fontSize: "12px",
                color: "var(--ink)",
              }}
            >
              {state.data!.version}
            </span>
          </StatusRow>
          <StatusRow label="Store" isLast={false}>
            <span
              style={{
                fontFamily: "var(--font-dm-mono)",
                fontSize: "12px",
                color: "var(--ink)",
              }}
            >
              {state.data!.store}
            </span>
          </StatusRow>
          <StatusRow label="Uptime" isLast={false}>
            <span
              style={{
                fontFamily: "var(--font-dm-mono)",
                fontSize: "12px",
                color: "var(--ink)",
              }}
            >
              {formatUptime(state.data!.uptime_seconds)}
            </span>
          </StatusRow>
          <StatusRow label="Response" isLast={true}>
            <span
              style={{
                fontFamily: "var(--font-dm-mono)",
                fontSize: "12px",
                color: responseColor(state.responseTimeMs),
                fontWeight: 500,
              }}
            >
              {state.responseTimeMs}ms
            </span>
          </StatusRow>
        </div>
      )}

      {/* Last checked */}
      {state.lastChecked && (
        <div
          style={{
            marginTop: "auto",
            paddingTop: "12px",
            fontSize: "11px",
            color: "var(--ink-subtle)",
          }}
        >
          Last checked {relativeTime(state.lastChecked)}
        </div>
      )}
    </div>
  );
}

function StatusRow({
  label,
  children,
  isLast,
}: {
  label: string;
  children: React.ReactNode;
  isLast: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 0",
        borderBottom: isLast ? "none" : "1px dotted var(--border)",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-dm-mono)",
          fontSize: "10px",
          fontWeight: 500,
          textTransform: "uppercase",
          color: "var(--ink-subtle)",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

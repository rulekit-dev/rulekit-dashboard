"use client";

import { useEffect, useRef, useState } from "react";
import Skeleton from "@/components/ui/Skeleton";

export interface StatCardProps {
  label: string;
  value: number | string | null;
  sublabel: string;
  icon: React.ReactNode;
  accentColor: string;
  /** Optional badge/tag shown next to the label */
  tag?: { text: string; color: string; bg: string };
  /** Optional secondary line below sublabel */
  detail?: React.ReactNode;
}

function useCountUp(target: number, duration = 700): number {
  const [current, setCurrent] = useState(0);
  const animRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (target === 0) { setCurrent(0); return; }
    startRef.current = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));
      if (progress < 1) animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [target, duration]);

  return current;
}

export default function StatCard({ label, value, sublabel, icon, accentColor, tag, detail }: StatCardProps) {
  const isNumber = typeof value === "number";
  const animatedValue = useCountUp(isNumber ? value : 0);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "var(--white)",
        borderRadius: 14,
        border: "1px solid var(--border)",
        padding: "20px 22px 18px",
        display: "flex",
        flexDirection: "column",
        transition: "box-shadow 0.18s, border-color 0.18s, transform 0.18s",
        boxShadow: hovered ? "0 6px 24px rgba(28,28,26,0.08)" : "0 1px 3px rgba(28,28,26,0.04)",
        borderColor: hovered ? "var(--border-med)" : "var(--border)",
        transform: hovered ? "translateY(-1px)" : "none",
        cursor: "default",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Accent corner glow */}
      <div style={{
        position: "absolute", top: -32, right: -32,
        width: 96, height: 96, borderRadius: "50%",
        background: `radial-gradient(circle, ${accentColor}22 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      {/* Top row: icon + label + tag */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Icon chip */}
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: `${accentColor}18`,
            border: `1px solid ${accentColor}30`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: accentColor, flexShrink: 0,
          }}>
            {icon}
          </div>
          <span style={{
            fontSize: 11, fontWeight: 600, color: "var(--ink-muted)",
            letterSpacing: "-0.01em",
          }}>
            {label}
          </span>
        </div>
        {tag && (
          <span style={{
            fontSize: 10, fontWeight: 600,
            color: tag.color, background: tag.bg,
            border: `1px solid ${tag.color}33`,
            borderRadius: 5, padding: "2px 7px",
            flexShrink: 0,
          }}>
            {tag.text}
          </span>
        )}
      </div>

      {/* Value */}
      {value === null ? (
        <Skeleton width="60px" height="40px" style={{ marginBottom: 6 }} />
      ) : (
        <div style={{
          fontSize: 36, fontWeight: 700,
          color: "var(--ink)", letterSpacing: "-0.05em",
          lineHeight: 1, marginBottom: 4,
        }}>
          {isNumber ? animatedValue : value}
        </div>
      )}

      {/* Sublabel */}
      <div style={{ fontSize: 12, fontWeight: 400, color: "var(--ink-muted)" }}>
        {sublabel}
      </div>

      {/* Detail line */}
      {detail && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
          {detail}
        </div>
      )}
    </div>
  );
}

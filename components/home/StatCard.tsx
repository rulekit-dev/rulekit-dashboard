"use client";

import { useEffect, useRef, useState } from "react";
import Skeleton from "@/components/ui/Skeleton";

interface StatCardProps {
  label: string;
  value: number | string | null;
  sublabel: string;
  dotColor: string;
  sublabelColor?: string;
  valueColor?: string;
}

function useCountUp(target: number, duration = 600): number {
  const [current, setCurrent] = useState(0);
  const animRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (target === 0) {
      setCurrent(0);
      return;
    }
    startRef.current = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCurrent(Math.round(eased * target));
      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [target, duration]);

  return current;
}

export default function StatCard({
  label,
  value,
  sublabel,
  dotColor,
  sublabelColor,
  valueColor,
}: StatCardProps) {
  const isNumber = typeof value === "number";
  const animatedValue = useCountUp(isNumber ? value : 0);

  return (
    <div
      style={{
        background: "var(--white)",
        borderRadius: "12px",
        border: "1px solid var(--border)",
        padding: "20px 24px",
      }}
    >
      {/* Label with dot */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: dotColor,
            flexShrink: 0,
          }}
        />
        <div
          style={{
            fontFamily: "var(--font-dm-mono)",
            fontWeight: 500,
            fontSize: "10px",
            textTransform: "uppercase",
            color: "var(--ink-subtle)",
            letterSpacing: "0.04em",
          }}
        >
          {label}
        </div>
      </div>

      {/* Value */}
      {value === null ? (
        <Skeleton width="60px" height="36px" />
      ) : (
        <div
          style={{
            fontSize: "32px",
            fontWeight: 800,
            color: valueColor || "var(--ink)",
            letterSpacing: "-0.02em",
            lineHeight: 1,
            marginBottom: "6px",
          }}
        >
          {isNumber ? animatedValue : value}
        </div>
      )}

      {/* Sublabel */}
      <div
        style={{
          fontSize: "12px",
          fontWeight: 400,
          color: sublabelColor || "var(--ink-muted)",
        }}
      >
        {sublabel}
      </div>
    </div>
  );
}

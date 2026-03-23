"use client";

import CodeBlock from "@/components/ui/CodeBlock";
import type { Version } from "@/lib/types";

interface CliQuickstartProps {
  workspace: string;
  versions: Map<string, Version[]>;
}

export default function CliQuickstart({ workspace, versions }: CliQuickstartProps) {
  // Find the most recently published ruleset key
  let latestKey = "your-ruleset-key";
  let latestTime = 0;
  versions.forEach((vList, key) => {
    for (const v of vList) {
      const t = new Date(v.created_at).getTime();
      if (t > latestTime) {
        latestTime = t;
        latestKey = key;
      }
    }
  });

  const code = `# pull latest rules\n$ rulekit pull --workspace ${workspace} --key ${latestKey}`;

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
      <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--ink)", marginBottom: "4px" }}>
        Pull rules into your project
      </div>
      <div
        style={{
          fontSize: "13px",
          fontWeight: 400,
          color: "var(--ink-muted)",
          marginBottom: "16px",
        }}
      >
        Run this in your application repo to pull the latest rules.
      </div>

      <CodeBlock code={code} />

      <div
        style={{
          display: "flex",
          gap: "16px",
          marginTop: "16px",
        }}
      >
        <a
          href="https://docs.rulekit.dev"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: "12px",
            fontWeight: 500,
            color: "var(--ink-muted)",
            textDecoration: "none",
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--orange)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink-muted)")}
        >
          Install rulekit CLI →
        </a>
        <a
          href={`/${workspace}/rulesets`}
          style={{
            fontSize: "12px",
            fontWeight: 500,
            color: "var(--ink-muted)",
            textDecoration: "none",
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--orange)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink-muted)")}
        >
          View all rulesets →
        </a>
      </div>
    </div>
  );
}

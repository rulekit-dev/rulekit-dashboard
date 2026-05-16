"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { createRuleset } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import type { Ruleset, Version } from "@/lib/types";

const KEY_RE = /^[a-z0-9_-]{1,128}$/;

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 18) return "Good afternoon";
  return "Good evening";
}

function getFirstName(email: string): string {
  const local = email.split("@")[0];
  const name = local.split(".")[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function formatRelative(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface WelcomeCardProps {
  workspace: string;
  workspaceCount: number;
  email: string;
  rulesets: Ruleset[];
  versions: Map<string, Version[]>;
  draftsCount: number;
  loading: boolean;
  onRulesetCreated: (rs: Ruleset) => void;
}

export default function WelcomeCard({
  workspace, workspaceCount, email, rulesets, versions, draftsCount, loading, onRulesetCreated,
}: WelcomeCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [createKey, setCreateKey] = useState("");
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createKeyError, setCreateKeyError] = useState("");
  const [createNameError, setCreateNameError] = useState("");
  const [creating, setCreating] = useState(false);

  let lastPublish: string | null = null;
  versions.forEach((vList) => {
    for (const v of vList) {
      if (!lastPublish || new Date(v.created_at) > new Date(lastPublish)) lastPublish = v.created_at;
    }
  });
  const lastPublishText = lastPublish ? formatRelative(lastPublish) : null;

  const hasDrafts = draftsCount > 0;
  const hasRulesets = rulesets.length > 0;

  function openCreate() {
    setCreateKey(""); setCreateName(""); setCreateDesc("");
    setCreateKeyError(""); setCreateNameError("");
    setShowCreate(true);
  }

  async function handleCreate() {
    let valid = true;
    if (!KEY_RE.test(createKey)) { setCreateKeyError("Lowercase letters, numbers, hyphens, underscores only (1-128 chars)"); valid = false; }
    else setCreateKeyError("");
    if (!createName.trim()) { setCreateNameError("Name is required"); valid = false; }
    else setCreateNameError("");
    if (!valid) return;
    setCreating(true);
    try {
      const rs = await createRuleset(workspace, createKey, createName, createDesc);
      onRulesetCreated(rs);
      setShowCreate(false);
      toast("Ruleset created");
    } catch {
      toast("Error", "Failed to create ruleset", "error");
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <div style={{
        position: "relative",
        borderRadius: 13,
        overflow: "hidden",
        background: "var(--ink)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}>
        {/* Dot-grid texture */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.055, pointerEvents: "none" }}>
          <defs>
            <pattern id="wc-grid" width="22" height="22" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="#fff" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#wc-grid)" />
        </svg>

        {/* Soft radial glow top-right */}
        <div style={{
          position: "absolute", top: -60, right: -60,
          width: 260, height: 260,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ position: "relative", zIndex: 1, padding: "22px 26px", display: "flex", alignItems: "center", gap: 24 }}>

          {/* Left: greeting + status */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", marginBottom: 6 }}>
              {getGreeting()}{email ? `, ${getFirstName(email)}` : ""}.
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              {!loading && (
                <StatusPill
                  ok={!hasDrafts && hasRulesets}
                  warn={hasDrafts}
                  neutral={!hasRulesets}
                  label={
                    !hasRulesets ? "No rulesets yet" :
                    hasDrafts ? `${draftsCount} unpublished draft${draftsCount !== 1 ? "s" : ""}` :
                    "Everything up to date"
                  }
                />
              )}
              {!loading && lastPublishText && (
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-mono)" }}>
                  last publish {lastPublishText}
                </span>
              )}
              {!loading && (
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", fontFamily: "var(--font-mono)" }}>
                  {rulesets.length} ruleset{rulesets.length !== 1 ? "s" : ""} · {workspaceCount} workspace{workspaceCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 48, background: "rgba(255,255,255,0.1)", flexShrink: 0 }} />

          {/* Right: actions */}
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button
              onClick={openCreate}
              style={{
                fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 12,
                padding: "7px 14px", borderRadius: 8, border: "none",
                background: "#fff", color: "var(--ink)", cursor: "pointer",
                letterSpacing: "-0.01em", transition: "opacity 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >
              + New ruleset
            </button>
            <button
              onClick={() => router.push(`/${workspace}/rulesets`)}
              style={{
                fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: 12,
                padding: "7px 14px", borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.7)",
                cursor: "pointer", letterSpacing: "-0.01em", transition: "background 0.12s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.13)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
            >
              Rulesets
            </button>
          </div>
        </div>
      </div>

      <Modal
        open={showCreate} onClose={() => setShowCreate(false)} title="New ruleset"
        footer={
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate} loading={creating}>Create</Button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Input label="Key" value={createKey} onChange={e => setCreateKey(e.target.value)} placeholder="my-ruleset" mono error={createKeyError} hint="Lowercase letters, numbers, hyphens, underscores" />
          <Input label="Name" value={createName} onChange={e => setCreateName(e.target.value)} placeholder="My Ruleset" error={createNameError} />
          <Input label="Description" value={createDesc} onChange={e => setCreateDesc(e.target.value)} placeholder="Optional description" />
        </div>
      </Modal>
    </>
  );
}

function StatusPill({ ok, warn, neutral, label }: { ok: boolean; warn: boolean; neutral: boolean; label: string }) {
  const color = ok ? "#1A7F4B" : warn ? "#B45309" : "rgba(255,255,255,0.35)";
  const bg = ok ? "rgba(26,127,75,0.2)" : warn ? "rgba(180,83,9,0.2)" : "rgba(255,255,255,0.08)";
  const dotColor = ok ? "#4ade80" : warn ? "#fbbf24" : "rgba(255,255,255,0.3)";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 11, fontWeight: 600, color,
      background: bg, borderRadius: 20,
      padding: "3px 9px",
      border: `1px solid ${ok ? "rgba(26,127,75,0.3)" : warn ? "rgba(180,83,9,0.3)" : "rgba(255,255,255,0.1)"}`,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: dotColor, display: "inline-block", flexShrink: 0 }} />
      {label}
    </span>
  );
}

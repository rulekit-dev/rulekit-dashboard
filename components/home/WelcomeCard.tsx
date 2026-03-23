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
  workspace,
  workspaceCount,
  email,
  rulesets,
  versions,
  draftsCount,
  loading,
  onRulesetCreated,
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

  // Find last publish time
  let lastPublish: string | null = null;
  versions.forEach((vList) => {
    for (const v of vList) {
      if (!lastPublish || new Date(v.created_at) > new Date(lastPublish)) {
        lastPublish = v.created_at;
      }
    }
  });

  const lastPublishText = lastPublish ? formatRelative(lastPublish) : "never published";

  // Context line
  let contextText: string;
  let contextColor: string;
  if (loading) {
    contextText = "";
    contextColor = "var(--ink-muted)";
  } else if (rulesets.length === 0) {
    contextText = "No rulesets yet. Create your first one to get started.";
    contextColor = "var(--ink-muted)";
  } else if (draftsCount > 0) {
    contextText = `${draftsCount} unpublished draft${draftsCount !== 1 ? "s" : ""} in ${workspace}.`;
    contextColor = "var(--orange)";
  } else {
    contextText = `Everything is up to date in ${workspace}.`;
    contextColor = "var(--green)";
  }

  function openCreate() {
    setCreateKey("");
    setCreateName("");
    setCreateDesc("");
    setCreateKeyError("");
    setCreateNameError("");
    setShowCreate(true);
  }

  async function handleCreate() {
    let valid = true;
    if (!KEY_RE.test(createKey)) {
      setCreateKeyError("Lowercase letters, numbers, hyphens, underscores only (1-128 chars)");
      valid = false;
    } else {
      setCreateKeyError("");
    }
    if (!createName.trim()) {
      setCreateNameError("Name is required");
      valid = false;
    } else {
      setCreateNameError("");
    }
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
      <div
        style={{
          position: "relative",
          borderRadius: "14px",
          padding: "28px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "24px",
          overflow: "hidden",
          background: "linear-gradient(135deg, #F05A28 0%, #FF7A4D 40%, #F89A76 70%, #FEE8E0 100%)",
        }}
      >
        {/* Background pattern */}
        <svg
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            opacity: 0.15,
            pointerEvents: "none",
          }}
        >
          <defs>
            <pattern
              id="welcome-grid"
              width="24"
              height="24"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r="1" fill="#1C1C1A" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#welcome-grid)" />
        </svg>

        {/* Left */}
        <div style={{ flex: 1, position: "relative", zIndex: 1 }}>
          <div
            style={{
              fontSize: "22px",
              fontWeight: 800,
              color: "#FFFFFF",
              marginBottom: "6px",
              textShadow: "0 1px 2px rgba(0,0,0,0.08)",
            }}
          >
            {getGreeting()}, {getFirstName(email)}.
          </div>
          {!loading && (
            <div
              style={{
                fontSize: "14px",
                fontWeight: 500,
                color: contextColor === "var(--green)" ? "#DCFCE7" : contextColor === "var(--orange)" ? "#FEE8E0" : "rgba(255,255,255,0.8)",
                marginBottom: "10px",
              }}
            >
              {contextText}
            </div>
          )}
          <div
            style={{
              fontFamily: "var(--font-dm-mono)",
              fontSize: "12px",
              fontWeight: 400,
              color: "rgba(255,255,255,0.6)",
            }}
          >
            {loading
              ? "\u00A0"
              : `${rulesets.length} ruleset${rulesets.length !== 1 ? "s" : ""} · ${workspaceCount} workspace${workspaceCount !== 1 ? "s" : ""} · last publish ${lastPublishText}`}
          </div>
        </div>

        {/* Right */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            flexShrink: 0,
            position: "relative",
            zIndex: 1,
          }}
        >
          <Button variant="primary" size="sm" onClick={openCreate}>
            New ruleset
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/${workspace}/rulesets`)}
            style={{ color: "#FFFFFF", borderColor: "rgba(0,0,0,0.15)", background: "rgba(0,0,0,0.2)", backdropFilter: "blur(4px)" }}
          >
            Open rulesets
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open("https://docs.rulekit.dev", "_blank")}
            style={{ color: "#FFFFFF", borderColor: "rgba(0,0,0,0.15)", background: "rgba(0,0,0,0.2)", backdropFilter: "blur(4px)" }}
          >
            View docs
          </Button>
        </div>
      </div>

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="New ruleset"
        footer={
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreate} loading={creating}>
              Create
            </Button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <Input
            label="Key"
            value={createKey}
            onChange={(e) => setCreateKey(e.target.value)}
            placeholder="my-ruleset"
            mono
            error={createKeyError}
            hint="Lowercase letters, numbers, hyphens, underscores"
          />
          <Input
            label="Name"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            placeholder="My Ruleset"
            error={createNameError}
          />
          <Input
            label="Description"
            value={createDesc}
            onChange={(e) => setCreateDesc(e.target.value)}
            placeholder="Optional description"
          />
        </div>
      </Modal>
    </>
  );
}

function formatRelative(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? "s" : ""} ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs} hour${diffHrs !== 1 ? "s" : ""} ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

"use client";

import { useState, CSSProperties } from "react";
import { createWorkspace } from "@/lib/api";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface OnboardingProps {
  onComplete: () => void;
}

const NAME_RE = /^[a-z0-9_-]{1,128}$/;

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [nameError, setNameError] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError("");
    setError("");

    if (!name) {
      setNameError("Name is required");
      return;
    }
    if (!NAME_RE.test(name)) {
      setNameError("Lowercase letters, numbers, hyphens, underscores only");
      return;
    }

    setCreating(true);
    try {
      await createWorkspace(name, description);
      onComplete();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || "Failed to create workspace");
    } finally {
      setCreating(false);
    }
  };

  const pageStyle: CSSProperties = {
    minHeight: "100vh",
    background: "var(--surface)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
  };

  const cardStyle: CSSProperties = {
    background: "var(--white)",
    width: "440px",
    padding: "36px",
    borderRadius: "14px",
    boxShadow: "0 4px 24px rgba(28,28,26,0.08)",
    textAlign: "center",
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div
          style={{
            fontFamily: "inherit",
            fontWeight: 800,
            fontSize: "24px",
            color: "var(--ink)",
            marginBottom: "4px",
          }}
        >
          rulekit<span style={{ color: "var(--orange-light)" }}>.</span>
        </div>

        <div
          style={{
            fontFamily: "inherit",
            fontWeight: 700,
            fontSize: "18px",
            color: "var(--ink)",
            marginTop: "24px",
            marginBottom: "6px",
          }}
        >
          Welcome! Create your first workspace
        </div>
        <div
          style={{
            fontFamily: "inherit",
            fontSize: "14px",
            color: "var(--ink-muted)",
            marginBottom: "24px",
            lineHeight: 1.5,
          }}
        >
          Workspaces organize your rulesets. You can create more later.
        </div>

        <form onSubmit={handleSubmit} style={{ textAlign: "left" }}>
          <div style={{ marginBottom: 16 }}>
            <Input
              label="Workspace name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. production"
              mono
              error={nameError}
              hint="Lowercase letters, numbers, hyphens, underscores"
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <Input
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
            />
          </div>

          {error && (
            <div
              style={{
                fontFamily: "inherit",
                fontSize: "13px",
                color: "#DC2626",
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          <Button
            variant="primary"
            size="lg"
            type="submit"
            loading={creating}
            style={{ width: "100%" }}
          >
            Create workspace
          </Button>
        </form>
      </div>
    </div>
  );
}

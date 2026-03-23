"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { APIKey, roleName, ROLE_VIEWER, ROLE_EDITOR, ROLE_ADMIN } from "@/lib/types";
import * as api from "@/lib/api";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";
import PageHeader from "@/components/layout/PageHeader";
import Table, { TableRow, TableCell } from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import ConfirmModal from "@/components/ui/ConfirmModal";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Skeleton from "@/components/ui/Skeleton";

function formatDate(s?: string) {
  if (!s) return "Never";
  return new Date(s).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function keyStatus(k: APIKey): { label: string; variant: "green" | "gray" | "orange" } {
  if (k.revoked_at) return { label: "Revoked", variant: "gray" };
  if (k.expires_at && new Date(k.expires_at) < new Date())
    return { label: "Expired", variant: "gray" };
  return { label: "Active", variant: "green" };
}

function roleBadgeVariant(mask: number): "orange" | "blue" | "purple" {
  if (mask >= ROLE_ADMIN) return "orange";
  if (mask >= ROLE_EDITOR) return "purple";
  return "blue";
}

export default function AdminKeysPage() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [keys, setKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokeTarget, setRevokeTarget] = useState<APIKey | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showKeyResult, setShowKeyResult] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [workspace, setWorkspace] = useState("");
  const [role, setRole] = useState(String(ROLE_VIEWER));
  const [expiresInDays, setExpiresInDays] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      router.replace("/admin/workspaces");
      return;
    }
    api
      .listApiKeys()
      .then((res) => setKeys(Array.isArray(res) ? res : res.data || []))
      .catch((err) => toast("Error", err.message, "error"))
      .finally(() => setLoading(false));
  }, [isAdmin, router, toast]);

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    try {
      await api.revokeApiKey(revokeTarget.id);
      setKeys((prev) =>
        prev.map((k) =>
          k.id === revokeTarget.id
            ? { ...k, revoked_at: new Date().toISOString() }
            : k
        )
      );
      toast("Key revoked", undefined, "success");
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast("Error", e.message, "error");
    }
    setRevokeTarget(null);
  };

  const handleCreate = async () => {
    setFormError("");
    if (!name.trim()) {
      setFormError("Name is required");
      return;
    }
    if (workspace !== "*" && !/^[a-z0-9_-]{1,128}$/.test(workspace)) {
      setFormError('Workspace must match [a-z0-9_-] or be "*"');
      return;
    }
    const days = expiresInDays ? parseInt(expiresInDays) : undefined;
    if (days !== undefined && (isNaN(days) || days < 0)) {
      setFormError("Expires must be a non-negative number");
      return;
    }

    setCreating(true);
    try {
      const result = await api.createApiKey(
        name.trim(),
        workspace,
        parseInt(role),
        days || undefined
      );
      setKeys((prev) => [...prev, result]);
      setShowCreate(false);
      setShowKeyResult(result.key);
      setName("");
      setWorkspace("");
      setRole(String(ROLE_VIEWER));
      setExpiresInDays("");
    } catch (err: unknown) {
      const e = err as { message?: string };
      setFormError(e.message || "Failed to create key");
    }
    setCreating(false);
  };

  const handleCopy = async () => {
    if (!showKeyResult) return;
    await navigator.clipboard.writeText(showKeyResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const headers = [
    { key: "name", label: "Name" },
    { key: "workspace", label: "Workspace", mono: true },
    { key: "role", label: "Role" },
    { key: "created", label: "Created", mono: true },
    { key: "expires", label: "Expires", mono: true },
    { key: "status", label: "Status" },
    { key: "actions", label: "", align: "right" },
  ];

  return (
    <div className="animate-fade-up">
      <PageHeader eyebrow="admin" title="API Keys" />

      <div style={{ padding: "24px 32px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              
              fontSize: "13px",
              color: "var(--ink-muted)",
            }}
          >
            {!loading && `${keys.length} key${keys.length !== 1 ? "s" : ""}`}
          </div>
          <Button variant="primary" onClick={() => setShowCreate(true)}>
            New key
          </Button>
        </div>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} width="100%" height="48px" />
            ))}
          </div>
        ) : (
          <Table headers={headers} emptyMessage="No API keys yet.">
            {keys.map((k, i) => {
              const status = keyStatus(k);
              return (
                <TableRow key={k.id}>
                  <TableCell primary>
                    <span
                      className="animate-row"
                      style={{ animationDelay: `${i * 0.05}s` }}
                    >
                      {k.name}
                    </span>
                  </TableCell>
                  <TableCell mono>{k.workspace}</TableCell>
                  <TableCell>
                    <Badge variant={roleBadgeVariant(k.role)}>
                      {roleName(k.role)}
                    </Badge>
                  </TableCell>
                  <TableCell mono>{formatDate(k.created_at)}</TableCell>
                  <TableCell mono>{formatDate(k.expires_at)}</TableCell>
                  <TableCell>
                    <Badge variant={status.variant} dot>
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell align="right">
                    {!k.revoked_at && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setRevokeTarget(k)}
                      >
                        Revoke
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </Table>
        )}
      </div>

      {/* Revoke confirmation */}
      <ConfirmModal
        open={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevoke}
        title="Revoke API key"
        message={`Revoke "${revokeTarget?.name}"? This cannot be undone.`}
        confirmLabel="Revoke"
        variant="danger"
      />

      {/* Create key modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="New API key"
        footer={
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreate} loading={creating}>
              Create
            </Button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My API key"
          />
          <Input
            label="Workspace"
            value={workspace}
            onChange={(e) => setWorkspace(e.target.value)}
            placeholder='e.g. "production" or "*"'
            mono
            hint='Use "*" for all workspaces'
          />
          <Select
            label="Role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            options={[
              { value: String(ROLE_VIEWER), label: "Viewer" },
              { value: String(ROLE_EDITOR), label: "Editor" },
              { value: String(ROLE_ADMIN), label: "Admin" },
            ]}
          />
          <Input
            label="Expires in (days)"
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(e.target.value)}
            placeholder="0 = never"
            hint="Leave empty or 0 for no expiration"
          />
          {formError && (
            <div
              style={{
                
                fontSize: 13,
                color: "#DC2626",
              }}
            >
              {formError}
            </div>
          )}
        </div>
      </Modal>

      {/* Key result modal */}
      <Modal
        open={!!showKeyResult}
        onClose={() => {}}
        title="Your new API key"
        size="md"
        preventBackdropClose
        footer={
          <Button variant="primary" onClick={() => { setShowKeyResult(null); setCopied(false); }}>
            Done
          </Button>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              background: "var(--ink)",
              borderRadius: 10,
              padding: 16,
              fontFamily: "var(--font-nunito)",
              fontSize: 14,
              color: "#E5E5E0",
              wordBreak: "break-all",
              lineHeight: 1.6,
            }}
          >
            {showKeyResult}
          </div>
          <Button variant="ghost" onClick={handleCopy}>
            {copied ? (
              <span style={{ color: "var(--green)" }}>Copied!</span>
            ) : (
              "Copy"
            )}
          </Button>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--orange)",
            }}
          >
            This key will not be shown again.
          </div>
        </div>
      </Modal>
    </div>
  );
}

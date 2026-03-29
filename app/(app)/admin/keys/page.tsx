"use client";

import { useState, useEffect, useRef, CSSProperties } from "react";
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

interface DropdownOption {
  value: string;
  label: string;
}

function FormDropdown({
  label,
  value,
  options,
  onChange,
  placeholder,
  hint,
}: {
  label?: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} style={{ width: "100%" }}>
      {label && <label style={ddLabelStyle}>{label}</label>}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setOpen(!open); }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          ...ddTriggerStyle,
          borderColor: open ? "var(--orange)" : hovered ? "var(--border-med)" : "var(--border-med)",
          boxShadow: open ? "0 0 0 3px var(--orange-dim)" : "none",
          background: open ? "var(--surface)" : hovered ? "var(--surface)" : "white",
        }}
      >
        <span style={{ flex: 1, color: selected ? "var(--ink)" : "var(--ink-subtle)" }}>
          {selected ? selected.label : (placeholder || "Select...")}
        </span>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ flexShrink: 0, opacity: 0.4, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
          <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {open && (
        <div style={ddMenuStyle}>
          {options.map((opt) => {
            const isSelected = opt.value === value;
            const isHov = hoveredItem === opt.value;
            return (
              <div
                key={opt.value}
                role="button"
                tabIndex={0}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                onKeyDown={(e) => { if (e.key === "Enter") { onChange(opt.value); setOpen(false); } }}
                onMouseEnter={() => setHoveredItem(opt.value)}
                onMouseLeave={() => setHoveredItem(null)}
                style={{
                  ...ddItemStyle,
                  fontWeight: isSelected ? 600 : 500,
                  color: isSelected ? "var(--orange-deep)" : isHov ? "var(--ink)" : "var(--ink-muted)",
                  background: isSelected ? "var(--orange-dim)" : isHov ? "var(--surface)" : "transparent",
                }}
              >
                {opt.label}
                {isSelected && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft: "auto", flexShrink: 0 }}>
                    <path d="M2.5 6.5L5 9L9.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      )}
      {hint && <div style={ddHintStyle}>{hint}</div>}
    </div>
  );
}

const ddLabelStyle: CSSProperties = {
  fontWeight: 600,
  fontSize: 13,
  color: "var(--ink)",
  marginBottom: 6,
  display: "block",
};

const ddTriggerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  padding: "9px 12px",
  border: "1px solid var(--border-med)",
  borderRadius: 9,
  cursor: "pointer",
  transition: "all 0.15s ease",
  fontSize: 14,
  fontWeight: 400,
  color: "var(--ink)",
  boxSizing: "border-box",
};

const ddMenuStyle: CSSProperties = {
  marginTop: 4,
  background: "var(--white)",
  border: "1px solid var(--border-med)",
  borderRadius: 9,
  padding: 4,
  maxHeight: 240,
  overflowY: "auto",
  boxShadow: "0 8px 32px rgba(28,28,26,0.12)",
};

const ddItemStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  fontSize: 13,
  padding: "7px 9px",
  borderRadius: 6,
  cursor: "pointer",
  transition: "background 0.12s, color 0.12s",
};

const ddHintStyle: CSSProperties = {
  fontWeight: 400,
  fontSize: 12,
  color: "var(--ink-muted)",
  marginTop: 3,
};

const dateInputStyle: CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid var(--border-med)",
  borderRadius: 9,
  fontSize: 14,
  fontWeight: 400,
  color: "var(--ink)",
  background: "white",
  boxSizing: "border-box",
  outline: "none",
  transition: "all 0.15s ease",
};

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
  const [expiresAt, setExpiresAt] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [copied, setCopied] = useState(false);
  const [workspaceOptions, setWorkspaceOptions] = useState<DropdownOption[]>([{ value: "*", label: "All Workspaces" }]);

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
    api
      .listWorkspaces()
      .then((res) => {
        const wsList = Array.isArray(res) ? res : res.data || [];
        setWorkspaceOptions([
          { value: "*", label: "All Workspaces" },
          ...wsList.map((ws) => ({ value: ws.name, label: ws.name })),
        ]);
      })
      .catch(() => {});
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
    let days: number | undefined;
    if (expiresAt) {
      const diff = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (diff < 1) {
        setFormError("Expiration date must be in the future");
        return;
      }
      days = diff;
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
      setExpiresAt("");
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
          <FormDropdown
            label="Workspace"
            value={workspace}
            options={workspaceOptions}
            onChange={setWorkspace}
            placeholder="Select workspace"
          />
          <FormDropdown
            label="Role"
            value={role}
            options={[
              { value: String(ROLE_VIEWER), label: "Viewer" },
              { value: String(ROLE_EDITOR), label: "Editor" },
              { value: String(ROLE_ADMIN), label: "Admin" },
            ]}
            onChange={setRole}
            placeholder="Select role"
          />
          <div>
            <label style={ddLabelStyle}>Expires at</label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
              style={dateInputStyle}
            />
            <div style={ddHintStyle}>Leave empty for no expiration</div>
          </div>
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

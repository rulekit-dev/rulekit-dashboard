"use client";

import { useState, useEffect, useRef, CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { APIKey, roleName, ROLE_VIEWER, ROLE_EDITOR, ROLE_ADMIN } from "@/lib/types";
import * as api from "@/lib/api";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";
import DataTable, { DataTableColumn } from "@/components/ui/DataTable";
import Button from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/ConfirmModal";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";

function timeAgo(str?: string) {
  if (!str) return "Never";
  const diff = Math.floor((Date.now() - new Date(str).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(str).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function keyStatus(k: APIKey): { label: string; color: string; bg: string; dot: string } {
  if (k.revoked_at) return { label: "Revoked", color: "var(--ink-subtle)", bg: "rgba(28,28,26,0.05)", dot: "var(--ink-subtle)" };
  if (k.expires_at && new Date(k.expires_at) < new Date()) return { label: "Expired", color: "var(--ink-subtle)", bg: "rgba(28,28,26,0.05)", dot: "var(--ink-subtle)" };
  return { label: "Active", color: "#16A34A", bg: "rgba(22,163,74,0.08)", dot: "#16A34A" };
}

function roleBadge(mask: number): { label: string; color: string; bg: string } {
  const label = roleName(mask);
  if (mask >= ROLE_ADMIN) return { label, color: "var(--ink)", bg: "rgba(28,28,26,0.06)" };
  return { label, color: "#2563EB", bg: "rgba(37,99,235,0.08)" };
}

interface DropdownOption { value: string; label: string; }

function FormDropdown({ label, value, options, onChange, placeholder, hint }: {
  label?: string; value: string; options: DropdownOption[];
  onChange: (value: string) => void; placeholder?: string; hint?: string;
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
        role="button" tabIndex={0}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setOpen(!open); }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 12px",
          border: `1px solid ${open ? "var(--ink)" : "var(--border-med)"}`,
          borderRadius: 9, cursor: "pointer", transition: "all 0.15s ease",
          fontSize: 14, fontWeight: 400, color: "var(--ink)", boxSizing: "border-box",
          boxShadow: open ? "0 0 0 3px rgba(28,28,26,0.06)" : "none",
          background: open || hovered ? "var(--surface)" : "white",
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
        <div style={{ marginTop: 4, background: "var(--white)", border: "1px solid var(--border-med)", borderRadius: 9, padding: 4, maxHeight: 240, overflowY: "auto", boxShadow: "0 8px 32px rgba(28,28,26,0.12)" }}>
          {options.map((opt) => {
            const isSelected = opt.value === value;
            const isHov = hoveredItem === opt.value;
            return (
              <div
                key={opt.value} role="button" tabIndex={0}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                onKeyDown={(e) => { if (e.key === "Enter") { onChange(opt.value); setOpen(false); } }}
                onMouseEnter={() => setHoveredItem(opt.value)}
                onMouseLeave={() => setHoveredItem(null)}
                style={{
                  display: "flex", alignItems: "center", gap: 9, fontSize: 13,
                  fontWeight: isSelected ? 600 : 500,
                  color: isSelected ? "var(--ink)" : isHov ? "var(--ink)" : "var(--ink-muted)",
                  padding: "7px 9px", borderRadius: 6, cursor: "pointer",
                  background: isSelected ? "rgba(28,28,26,0.06)" : isHov ? "var(--surface)" : "transparent",
                  transition: "background 0.12s, color 0.12s",
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
      {hint && <div style={{ fontWeight: 400, fontSize: 12, color: "var(--ink-muted)", marginTop: 3 }}>{hint}</div>}
    </div>
  );
}

const ddLabelStyle: CSSProperties = {
  fontWeight: 600, fontSize: 13, color: "var(--ink)", marginBottom: 6, display: "block",
};

const dateInputStyle: CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1px solid var(--border-med)",
  borderRadius: 9, fontSize: 14, fontWeight: 400, color: "var(--ink)",
  background: "white", boxSizing: "border-box", outline: "none", transition: "all 0.15s ease",
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

  const [name, setName] = useState("");
  const [workspace, setWorkspace] = useState("");
  const [role, setRole] = useState(String(ROLE_VIEWER));
  const [expiresAt, setExpiresAt] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [copied, setCopied] = useState(false);
  const [workspaceOptions, setWorkspaceOptions] = useState<DropdownOption[]>([{ value: "*", label: "All Workspaces" }]);

  useEffect(() => {
    if (!isAdmin) { router.replace("/admin/workspaces"); return; }
    api.listApiKeys()
      .then((res) => setKeys(Array.isArray(res) ? res : res.data || []))
      .catch((err) => toast("Error", err.message, "error"))
      .finally(() => setLoading(false));
    api.listWorkspaces()
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
      setKeys((prev) => prev.map((k) => k.id === revokeTarget.id ? { ...k, revoked_at: new Date().toISOString() } : k));
      toast("Key revoked", undefined, "success");
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast("Error", e.message, "error");
    }
    setRevokeTarget(null);
  };

  const handleCreate = async () => {
    setFormError("");
    if (!name.trim()) { setFormError("Name is required"); return; }
    if (workspace !== "*" && !/^[a-z0-9_-]{1,128}$/.test(workspace)) { setFormError('Workspace must match [a-z0-9_-] or be "*"'); return; }
    let days: number | undefined;
    if (expiresAt) {
      const diff = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (diff < 1) { setFormError("Expiration date must be in the future"); return; }
      days = diff;
    }
    setCreating(true);
    try {
      const result = await api.createApiKey(name.trim(), workspace, parseInt(role), days || undefined);
      setKeys((prev) => [...prev, result]);
      setShowCreate(false);
      setShowKeyResult(result.key);
      setName(""); setWorkspace(""); setRole(String(ROLE_VIEWER)); setExpiresAt("");
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

  const columns: DataTableColumn<APIKey>[] = [
    {
      key: "name",
      label: "Name",
      width: "180px",
      sortable: true,
      searchable: true,
      value: k => k.name,
      render: (k) => (
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.01em" }}>{k.name}</span>
      ),
    },
    {
      key: "workspace",
      label: "Workspace",
      width: "140px",
      sortable: true,
      searchable: true,
      value: k => k.workspace,
      render: (k) => (
        <span style={{
          fontSize: 12, fontWeight: 600, color: "var(--ink)",
          background: "rgba(28,28,26,0.05)", border: "1px solid var(--border)",
          borderRadius: 6, padding: "3px 9px", whiteSpace: "nowrap",
        }}>
          {k.workspace}
        </span>
      ),
    },
    {
      key: "role",
      label: "Role",
      width: "100px",
      sortable: true,
      value: k => roleName(k.role),
      render: (k) => {
        const rb = roleBadge(k.role);
        return (
          <span style={{
            fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 12,
            color: rb.color, background: rb.bg, whiteSpace: "nowrap",
          }}>
            {rb.label}
          </span>
        );
      },
    },
    {
      key: "created",
      label: "Created",
      width: "120px",
      sortable: true,
      value: k => k.created_at,
      render: (k) => (
        <span style={{ fontSize: 11, color: "var(--ink-subtle)" }}>{timeAgo(k.created_at)}</span>
      ),
    },
    {
      key: "expires",
      label: "Expires",
      width: "120px",
      sortable: true,
      value: k => k.expires_at || "",
      render: (k) => (
        <span style={{ fontSize: 11, color: "var(--ink-subtle)", fontStyle: k.expires_at ? "normal" : "italic" }}>
          {k.expires_at ? timeAgo(k.expires_at) : "Never"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      width: "100px",
      value: k => keyStatus(k).label,
      render: (k) => {
        const s = keyStatus(k);
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: s.color }}>{s.label}</span>
          </div>
        );
      },
    },
    {
      key: "actions",
      label: "",
      width: "90px",
      align: "right",
      render: (k) => (
        <div style={{ display: "flex", justifyContent: "flex-end" }} onClick={e => e.stopPropagation()}>
          {!k.revoked_at && <ActionBtn label="Revoke" onClick={() => setRevokeTarget(k)} />}
        </div>
      ),
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--surface)" }} className="animate-fade-up">
      <div style={{
        background: "var(--white)", borderBottom: "1px solid var(--border)",
        padding: "0 28px", height: 52,
        display: "flex", alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-subtle)" }}>Admin</span>
          <span style={{ color: "var(--border-med)", fontSize: 12 }}>/</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.01em" }}>API Keys</span>
          {!loading && (
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-subtle)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 5, padding: "2px 7px" }}>
              {keys.length}
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: "24px 28px" }}>
        <DataTable
          columns={columns}
          rows={keys}
          rowKey={k => k.id}
          loading={loading}
          emptyTitle="No API keys yet"
          emptyDescription="Create your first API key to get started."
          emptyAction={isAdmin ? <Button variant="primary" onClick={() => setShowCreate(true)}>New key</Button> : undefined}
          pageSize={10}
          addLabel="New key"
          onAdd={isAdmin ? () => setShowCreate(true) : undefined}
        />
      </div>

      <ConfirmModal
        open={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevoke}
        title="Revoke API key"
        message={`Revoke "${revokeTarget?.name}"? This cannot be undone.`}
        confirmLabel="Revoke"
        variant="danger"
      />

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="New API key"
        footer={
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate} loading={creating}>Create</Button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="My API key" />
          <FormDropdown label="Workspace" value={workspace} options={workspaceOptions} onChange={setWorkspace} placeholder="Select workspace" />
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
            <div style={{ fontWeight: 400, fontSize: 12, color: "var(--ink-muted)", marginTop: 3 }}>Leave empty for no expiration</div>
          </div>
          {formError && <div style={{ fontSize: 13, color: "#DC2626" }}>{formError}</div>}
        </div>
      </Modal>

      <Modal
        open={!!showKeyResult}
        onClose={() => {}}
        title="Your new API key"
        size="md"
        preventBackdropClose
        footer={
          <Button variant="primary" onClick={() => { setShowKeyResult(null); setCopied(false); }}>Done</Button>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{
            background: "var(--ink)", borderRadius: 10, padding: 16,
            fontFamily: "var(--font-sans)", fontSize: 14, color: "#E5E5E0",
            wordBreak: "break-all", lineHeight: 1.6,
          }}>
            {showKeyResult}
          </div>
          <Button variant="ghost" onClick={handleCopy}>
            {copied ? <span style={{ color: "var(--green)" }}>Copied!</span> : "Copy"}
          </Button>
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--ink)" }}>
            This key will not be shown again.
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ActionBtn({ label, onClick }: { label: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: "4px 10px", borderRadius: 6,
        border: `1px solid ${hovered ? "rgba(201,42,42,0.2)" : "var(--border)"}`,
        background: hovered ? "rgba(201,42,42,0.08)" : "transparent",
        color: hovered ? "#C92A2A" : "var(--ink-muted)",
        fontSize: 11, fontWeight: 600, cursor: "pointer",
        transition: "all 0.13s", fontFamily: "var(--font-sans)",
      }}
    >
      {label}
    </button>
  );
}

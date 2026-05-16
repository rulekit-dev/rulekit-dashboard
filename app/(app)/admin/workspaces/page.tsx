"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import ConfirmModal from "@/components/ui/ConfirmModal";
import DataTable, { DataTableColumn } from "@/components/ui/DataTable";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { listWorkspaces, createWorkspace, deleteWorkspace } from "@/lib/api";
import type { Workspace } from "@/lib/types";

const NAME_RE = /^[a-z0-9_-]{1,128}$/;

function timeAgo(str: string) {
  const diff = Math.floor((Date.now() - new Date(str).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(str).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function WorkspacesPage() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Workspace | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createNameError, setCreateNameError] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    listWorkspaces()
      .then((res) => setWorkspaces(Array.isArray(res) ? res : res.data || []))
      .catch(() => toast("Error", "Failed to load workspaces", "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  function openCreate() {
    setCreateName(""); setCreateDesc(""); setCreateNameError("");
    setShowCreate(true);
  }

  async function handleCreate() {
    if (!NAME_RE.test(createName)) { setCreateNameError("Lowercase letters, numbers, hyphens, underscores only (1-128 chars)"); return; }
    setCreateNameError("");
    setCreating(true);
    try {
      const ws = await createWorkspace(createName, createDesc);
      setWorkspaces((prev) => [...prev, ws]);
      setShowCreate(false);
      toast("Workspace created");
    } catch {
      toast("Error", "Failed to create workspace", "error");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteWorkspace(deleteTarget.name);
      setWorkspaces((prev) => prev.filter((w) => w.name !== deleteTarget.name));
      toast("Workspace deleted");
    } catch {
      toast("Error", "Failed to delete workspace", "error");
    } finally {
      setDeleteTarget(null);
    }
  }

  const columns: DataTableColumn<Workspace>[] = [
    {
      key: "name",
      label: "Name",
      width: "220px",
      sortable: true,
      searchable: true,
      value: ws => ws.name,
      render: (ws) => (
        <span style={{
          fontSize: 12, fontWeight: 600, letterSpacing: "-0.01em",
          color: "var(--ink)", background: "rgba(28,28,26,0.05)",
          border: "1px solid var(--border)", borderRadius: 6, padding: "3px 9px",
          whiteSpace: "nowrap", cursor: "pointer",
        }}
          onClick={() => router.push(`/${ws.name}/home`)}
        >
          {ws.name}
        </span>
      ),
    },
    {
      key: "description",
      label: "Description",
      width: "1fr",
      searchable: true,
      value: ws => ws.description || "",
      render: (ws) => (
        <span style={{ fontSize: 12, color: ws.description ? "var(--ink-muted)" : "var(--ink-subtle)", fontStyle: ws.description ? "normal" : "italic" }}>
          {ws.description || "No description"}
        </span>
      ),
    },
    {
      key: "created",
      label: "Created",
      width: "130px",
      sortable: true,
      value: ws => ws.created_at,
      render: (ws) => (
        <span style={{ fontSize: 11, color: "var(--ink-subtle)" }}>{timeAgo(ws.created_at)}</span>
      ),
    },
    {
      key: "actions",
      label: "",
      width: "120px",
      align: "right",
      render: (ws) => (
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }} onClick={e => e.stopPropagation()}>
          <ActionBtn label="View" variant="view" onClick={() => router.push(`/${ws.name}/home`)} />
          {isAdmin && <ActionBtn label="Delete" variant="delete" onClick={() => setDeleteTarget(ws)} />}
        </div>
      ),
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--surface)" }} className="animate-fade-up">
      {/* Top bar */}
      <div style={{
        background: "var(--white)", borderBottom: "1px solid var(--border)",
        padding: "0 28px", height: 52,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-subtle)" }}>Admin</span>
          <span style={{ color: "var(--border-med)", fontSize: 12 }}>/</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.01em" }}>Workspaces</span>
          {!loading && (
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-subtle)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 5, padding: "2px 7px" }}>
              {workspaces.length}
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: "24px 28px" }}>
        <DataTable
          columns={columns}
          rows={workspaces}
          rowKey={ws => ws.name}
          loading={loading}
          onRowClick={ws => router.push(`/${ws.name}/home`)}
          emptyTitle="No workspaces yet"
          emptyDescription="Create your first workspace to get started."
          emptyAction={isAdmin ? <Button variant="primary" onClick={openCreate}>Create workspace</Button> : undefined}
          pageSize={10}
          addLabel="New workspace"
          onAdd={isAdmin ? openCreate : undefined}
        />
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New workspace"
        footer={
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate} loading={creating}>Create</Button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Input label="Name" value={createName} onChange={e => setCreateName(e.target.value)} placeholder="my-workspace" mono error={createNameError} hint="Lowercase letters, numbers, hyphens, underscores" />
          <Input label="Description" value={createDesc} onChange={e => setCreateDesc(e.target.value)} placeholder="Optional description" />
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete workspace" message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete" variant="danger"
      />
    </div>
  );
}

function ActionBtn({ label, variant, onClick }: { label: string; variant: "view" | "delete"; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const isDelete = variant === "delete";
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: "4px 10px", borderRadius: 6,
        border: `1px solid ${isDelete ? (hovered ? "rgba(201,42,42,0.2)" : "var(--border)") : (hovered ? "rgba(37,99,235,0.25)" : "var(--border)")}`,
        background: isDelete ? (hovered ? "rgba(201,42,42,0.08)" : "transparent") : (hovered ? "rgba(37,99,235,0.07)" : "transparent"),
        color: isDelete ? (hovered ? "#C92A2A" : "var(--ink-muted)") : (hovered ? "#2563EB" : "var(--ink-muted)"),
        fontSize: 11, fontWeight: 600, cursor: "pointer",
        transition: "all 0.13s", fontFamily: "var(--font-sans)",
      }}
    >
      {label}
    </button>
  );
}

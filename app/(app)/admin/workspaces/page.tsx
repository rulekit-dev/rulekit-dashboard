"use client";

import { useEffect, useState, CSSProperties } from "react";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import Button from "@/components/ui/Button";
import Table, { TableRow, TableCell } from "@/components/ui/Table";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import ConfirmModal from "@/components/ui/ConfirmModal";
import Skeleton from "@/components/ui/Skeleton";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { listWorkspaces, createWorkspace, deleteWorkspace } from "@/lib/api";
import type { Workspace } from "@/lib/types";

const NAME_RE = /^[a-z0-9_-]{1,128}$/;

function formatDate(str: string) {
  return new Date(str).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function WorkspacesPage() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createNameError, setCreateNameError] = useState("");
  const [creating, setCreating] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Workspace | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    listWorkspaces()
      .then((res) => setWorkspaces(Array.isArray(res) ? res : res.data || []))
      .catch(() => toast("Error", "Failed to load workspaces", "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  function openCreate() {
    setCreateName("");
    setCreateDesc("");
    setCreateNameError("");
    setShowCreate(true);
  }

  async function handleCreate() {
    if (!NAME_RE.test(createName)) {
      setCreateNameError("Lowercase letters, numbers, hyphens, underscores only (1-128 chars)");
      return;
    }
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
    setDeleting(true);
    try {
      await deleteWorkspace(deleteTarget.name);
      setWorkspaces((prev) => prev.filter((w) => w.name !== deleteTarget.name));
      toast("Workspace deleted");
    } catch {
      toast("Error", "Failed to delete workspace", "error");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  const linkStyle: CSSProperties = {
    color: "var(--orange)",
    textDecoration: "none",
    fontWeight: 600,
  };

  const headers = [
    { key: "name", label: "Name" },
    { key: "description", label: "Description" },
    { key: "created", label: "Created", mono: true },
    { key: "actions", label: "", align: "right" },
  ];

  return (
    <div className="animate-fade-up">
      <PageHeader eyebrow="admin" title="Workspaces" />

      <div style={{ padding: "24px 32px" }}>
        {isAdmin && (
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
              {!loading && `${workspaces.length} workspace${workspaces.length !== 1 ? "s" : ""}`}
            </div>
            <Button variant="primary" onClick={openCreate}>New workspace</Button>
          </div>
        )}

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} width="100%" height="48px" />
            ))}
          </div>
        ) : (
          <Table
            headers={headers}
            emptyMessage="No workspaces yet."
            emptyAction={isAdmin ? <Button variant="primary" onClick={openCreate}>Create workspace</Button> : undefined}
          >
            {workspaces.map((ws, index) => (
              <TableRow key={ws.name} style={{ animationDelay: `${index * 0.05}s` }}>
                <TableCell primary>
                  <Link href={`/${ws.name}/home`} style={linkStyle}>{ws.name}</Link>
                </TableCell>
                <TableCell>{ws.description || "\u2014"}</TableCell>
                <TableCell mono>{formatDate(ws.created_at)}</TableCell>
                <TableCell align="right">
                  {isAdmin && (
                    <Button variant="danger" size="sm" onClick={() => setDeleteTarget(ws)}>
                      Delete
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </Table>
        )}
      </div>

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="New workspace"
        footer={
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate} loading={creating}>Create</Button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <Input
            label="Name"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            placeholder="my-workspace"
            mono
            error={createNameError}
            hint="Lowercase letters, numbers, hyphens, underscores"
          />
          <Input
            label="Description"
            value={createDesc}
            onChange={(e) => setCreateDesc(e.target.value)}
            placeholder="Optional description"
          />
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete workspace"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}

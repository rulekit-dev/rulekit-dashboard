"use client";

import { useEffect, useState, CSSProperties } from "react";
import { useParams } from "next/navigation";
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
import { listRulesets, createRuleset, deleteRuleset } from "@/lib/api";
import type { Ruleset } from "@/lib/types";

const KEY_RE = /^[a-z0-9_-]{1,128}$/;

function formatDate(str: string) {
  return new Date(str).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function RulesetsPage() {
  const params = useParams();
  const workspace = params.workspace as string;
  const { hasRole } = useAuth();
  const { toast } = useToast();

  const canEdit = hasRole(workspace, 3);

  const [rulesets, setRulesets] = useState<Ruleset[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [createKey, setCreateKey] = useState("");
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createKeyError, setCreateKeyError] = useState("");
  const [createNameError, setCreateNameError] = useState("");
  const [creating, setCreating] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Ruleset | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    listRulesets(workspace)
      .then((res) => setRulesets(Array.isArray(res) ? res : res.data || []))
      .catch(() => toast("Error", "Failed to load rulesets", "error"))
      .finally(() => setLoading(false));
  }, [workspace, toast]);

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
      setRulesets((prev) => [...prev, rs]);
      setShowCreate(false);
      toast("Ruleset created");
    } catch {
      toast("Error", "Failed to create ruleset", "error");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteRuleset(workspace, deleteTarget.key);
      setRulesets((prev) => prev.filter((r) => r.key !== deleteTarget.key));
      toast("Ruleset deleted");
    } catch {
      toast("Error", "Failed to delete ruleset", "error");
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
    { key: "key", label: "Key", mono: true },
    { key: "name", label: "Name" },
    { key: "description", label: "Description" },
    { key: "updated", label: "Updated", mono: true },
    { key: "actions", label: "", align: "right" },
  ];

  return (
    <div className="animate-fade-up">
      <PageHeader eyebrow={workspace} title="Rulesets" />

      <div style={{ padding: "24px 32px" }}>
        {canEdit && (
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
              {!loading && `${rulesets.length} ruleset${rulesets.length !== 1 ? "s" : ""}`}
            </div>
            <Button variant="primary" onClick={openCreate}>New ruleset</Button>
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
            emptyMessage="No rulesets yet."
            emptyAction={canEdit ? <Button variant="primary" onClick={openCreate}>Create ruleset</Button> : undefined}
          >
            {rulesets.map((rs, index) => (
              <TableRow key={rs.key} style={{ animationDelay: `${index * 0.05}s` }}>
                <TableCell mono>
                  <Link href={`/${workspace}/rulesets/${rs.key}`} style={linkStyle}>{rs.key}</Link>
                </TableCell>
                <TableCell primary>{rs.name}</TableCell>
                <TableCell>{rs.description || "\u2014"}</TableCell>
                <TableCell mono>{formatDate(rs.updated_at)}</TableCell>
                <TableCell align="right">
                  {canEdit && (
                    <Button variant="danger" size="sm" onClick={() => setDeleteTarget(rs)}>
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
        title="New ruleset"
        footer={
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate} loading={creating}>Create</Button>
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

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete ruleset"
        message={`Are you sure you want to delete "${deleteTarget?.name}" (${deleteTarget?.key})? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}

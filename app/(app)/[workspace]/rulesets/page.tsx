"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import ConfirmModal from "@/components/ui/ConfirmModal";
import DataTable, { DataTableColumn } from "@/components/ui/DataTable";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { listRulesets, createRuleset, deleteRuleset, renameRuleset } from "@/lib/api";
import type { Ruleset } from "@/lib/types";

const KEY_RE = /^[a-z0-9_-]{1,128}$/;

function timeAgo(str: string) {
  const diff = Math.floor((Date.now() - new Date(str).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(str).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function RulesetsPage() {
  const params = useParams();
  const router = useRouter();
  const workspace = params.workspace as string;
  const { hasRole } = useAuth();
  const { toast } = useToast();

  const canEdit = hasRole(workspace, 3);

  const [rulesets, setRulesets] = useState<Ruleset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Ruleset | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [createKey, setCreateKey] = useState("");
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createKeyError, setCreateKeyError] = useState("");
  const [createNameError, setCreateNameError] = useState("");
  const [creating, setCreating] = useState(false);

  const [renameTarget, setRenameTarget] = useState<Ruleset | null>(null);
  const [renameNewKey, setRenameNewKey] = useState("");
  const [renameNewName, setRenameNewName] = useState("");
  const [renameNewDesc, setRenameNewDesc] = useState("");
  const [renameKeyError, setRenameKeyError] = useState("");
  const [renameNameError, setRenameNameError] = useState("");
  const [renaming, setRenaming] = useState(false);

  function fetchRulesets(search: string) {
    setLoading(true);
    listRulesets(workspace, search)
      .then((res) => setRulesets(Array.isArray(res) ? res : res.data || []))
      .catch(() => toast("Error", "Failed to load rulesets", "error"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchRulesets("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace]);

  function handleSearchChange(q: string) {
    setSearchQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchRulesets(q), 300);
  }

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

  function openRename(rs: Ruleset) {
    setRenameTarget(rs);
    setRenameNewKey(rs.key);
    setRenameNewName(rs.name);
    setRenameNewDesc(rs.description || "");
    setRenameKeyError("");
    setRenameNameError("");
  }

  async function handleRename() {
    if (!renameTarget) return;
    let valid = true;
    if (!KEY_RE.test(renameNewKey)) { setRenameKeyError("Lowercase letters, numbers, hyphens, underscores only (1-128 chars)"); valid = false; }
    else setRenameKeyError("");
    if (!renameNewName.trim()) { setRenameNameError("Name is required"); valid = false; }
    else setRenameNameError("");
    if (!valid) return;
    setRenaming(true);
    try {
      const updated = await renameRuleset(workspace, renameTarget.key, renameNewKey, renameNewName, renameNewDesc);
      setRulesets((prev) => prev.map((r) => r.key === renameTarget.key ? updated : r));
      setRenameTarget(null);
      toast("Ruleset renamed");
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e.code === "CONFLICT") {
        setRenameKeyError("Cannot rename — ruleset has published versions. Delete and recreate instead.");
      } else if (e.code === "ALREADY_EXISTS") {
        setRenameKeyError("A ruleset with that key already exists.");
      } else {
        toast("Error", "Failed to rename ruleset", "error");
      }
    } finally {
      setRenaming(false);
    }
  }

  const columns: DataTableColumn<Ruleset>[] = [
    {
      key: "key",
      label: "Key",
      width: "200px",
      sortable: true,
      value: rs => rs.key,
      render: (rs) => (
        <span style={{
          fontSize: 12, fontWeight: 600, letterSpacing: "-0.01em",
          color: "var(--ink)",
          background: "rgba(28,28,26,0.05)",
          border: "1px solid var(--border)",
          borderRadius: 6, padding: "3px 9px",
          whiteSpace: "nowrap",
        }}>
          {rs.key}
        </span>
      ),
    },
    {
      key: "name",
      label: "Name",
      width: "1fr",
      sortable: true,
      value: rs => rs.name,
      render: (rs) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.01em" }}>
            {rs.name}
          </span>
          {rs.description && (
            <span style={{
              fontSize: 11, color: "var(--ink-subtle)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 360,
            }}>
              {rs.description}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "updated",
      label: "Last updated",
      width: "140px",
      sortable: true,
      value: rs => rs.updated_at,
      render: (rs) => (
        <span style={{ fontSize: 11, color: "var(--ink-subtle)" }}>
          {timeAgo(rs.updated_at)}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      width: "180px",
      align: "right",
      render: (rs) => (
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }} onClick={e => e.stopPropagation()}>
          <ActionBtn
            label="View"
            icon={<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 6s2-4 5-4 5 4 5 4-2 4-5 4-5-4-5-4Z" stroke="currentColor" strokeWidth="1.2"/><circle cx="6" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.2"/></svg>}
            onClick={() => router.push(`/${workspace}/rulesets/${rs.key}`)}
          />
          {canEdit && (
            <>
              <ActionBtn
                label="Rename"
                icon={<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8.5 1.5a1.414 1.414 0 0 1 2 2L4 10l-3 1 1-3 6.5-6.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                onClick={() => openRename(rs)}
              />
              <ActionBtn
                label="Delete"
                icon={<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 3h8M4.5 3V2h3v1M5 3v5.5M7 3v5.5M2.5 3l.5 6.5h6l.5-6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                onClick={() => setDeleteTarget(rs)}
                danger
              />
            </>
          )}
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
          <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-subtle)" }}>
            {workspace}
          </span>
          <span style={{ color: "var(--border-med)", fontSize: 12 }}>/</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.01em" }}>Rulesets</span>
          {!loading && (
            <span style={{
              fontSize: 10, fontWeight: 600, color: "var(--ink-subtle)",
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 5, padding: "2px 7px",
            }}>
              {rulesets.length}
            </span>
          )}
        </div>
        {/* Server-side search input */}
        <div style={{ position: "relative" }}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--ink-subtle)", pointerEvents: "none" }}>
            <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M8.5 8.5 11 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search rulesets…"
            value={searchQuery}
            onChange={e => handleSearchChange(e.target.value)}
            style={{
              paddingLeft: 28, paddingRight: 10, height: 30, fontSize: 12,
              border: "1px solid var(--border)", borderRadius: 7,
              background: "var(--surface)", color: "var(--ink)",
              outline: "none", width: 200,
              fontFamily: "var(--font-sans)",
            }}
          />
        </div>
      </div>

      <div style={{ padding: "24px 28px" }}>
        <DataTable
          columns={columns}
          rows={rulesets}
          rowKey={rs => rs.key}
          loading={loading}
          onRowClick={rs => router.push(`/${workspace}/rulesets/${rs.key}`)}
          emptyTitle={searchQuery ? "No rulesets match your search" : "No rulesets yet"}
          emptyDescription={searchQuery ? "Try a different keyword." : "Create your first ruleset to get started."}
          emptyAction={!searchQuery && canEdit ? <Button variant="primary" onClick={openCreate}>Create ruleset</Button> : undefined}
          pageSize={10}
          addLabel="New ruleset"
          onAdd={canEdit ? openCreate : undefined}
        />
      </div>

      {/* Create modal */}
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

      {/* Rename modal */}
      <Modal
        open={!!renameTarget} onClose={() => setRenameTarget(null)} title="Rename ruleset"
        footer={
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button variant="ghost" onClick={() => setRenameTarget(null)}>Cancel</Button>
            <Button variant="primary" onClick={handleRename} loading={renaming}>Rename</Button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Input label="Key" value={renameNewKey} onChange={e => setRenameNewKey(e.target.value)} placeholder="my-ruleset" mono error={renameKeyError} hint="Lowercase letters, numbers, hyphens, underscores" />
          <Input label="Name" value={renameNewName} onChange={e => setRenameNewName(e.target.value)} placeholder="My Ruleset" error={renameNameError} />
          <Input label="Description" value={renameNewDesc} onChange={e => setRenameNewDesc(e.target.value)} placeholder="Optional description" />
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

function ActionBtn({ label, icon, onClick, danger }: {
  label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const color = danger
    ? (hovered ? "#C92A2A" : "var(--ink-muted)")
    : (hovered ? "#2563EB" : "var(--ink-muted)");
  const bg = danger
    ? (hovered ? "rgba(201,42,42,0.08)" : "transparent")
    : (hovered ? "rgba(37,99,235,0.07)" : "transparent");
  const border = danger
    ? (hovered ? "rgba(201,42,42,0.2)" : "var(--border)")
    : (hovered ? "rgba(37,99,235,0.25)" : "var(--border)");

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: "4px 10px", borderRadius: 6,
        border: `1px solid ${border}`,
        background: bg, color,
        fontSize: 11, fontWeight: 600,
        cursor: "pointer", transition: "all 0.13s",
        fontFamily: "var(--font-sans)",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

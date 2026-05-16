"use client";

import { useState, useEffect, useRef, CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { User, UserRole, ROLE_VIEWER, ROLE_EDITOR, ROLE_ADMIN } from "@/lib/types";
import * as api from "@/lib/api";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";
import DataTable, { DataTableColumn } from "@/components/ui/DataTable";
import Button from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/ConfirmModal";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";

function timeAgo(str: string) {
  if (!str) return "—";
  const diff = Math.floor((Date.now() - new Date(str).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(str).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const ROLE_OPTIONS = [
  { value: ROLE_VIEWER, label: "Viewer", description: "Read-only access", color: "#2563EB", bg: "rgba(37,99,235,0.08)" },
  { value: ROLE_EDITOR, label: "Editor", description: "Can edit rulesets", color: "#2563EB", bg: "rgba(37,99,235,0.08)" },
  { value: ROLE_ADMIN, label: "Admin", description: "Full access", color: "var(--ink)", bg: "rgba(28,28,26,0.06)" },
];

const roleBadgeStyle: CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 11,
  fontWeight: 600,
  padding: "2px 10px",
  borderRadius: 12,
  display: "inline-block",
  whiteSpace: "nowrap",
};

const fieldLabelStyle: CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--ink-muted)",
  display: "block",
  marginBottom: 4,
};

const sectionLabelStyle: CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "var(--ink-subtle)",
  marginBottom: 8,
};

function WorkspacePickerDropdown({ workspaces, value, onChange }: {
  workspaces: string[]; value: string; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [hoveredTrigger, setHoveredTrigger] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const allOptions = ["*", ...workspaces];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <span style={fieldLabelStyle}>Workspace</span>
      <div
        role="button" tabIndex={0}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setOpen(!open); }}
        onMouseEnter={() => setHoveredTrigger(true)}
        onMouseLeave={() => setHoveredTrigger(false)}
        style={{
          display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "7px 10px",
          background: open ? "var(--surface-2)" : hoveredTrigger ? "var(--surface)" : "var(--white)",
          border: "1px solid var(--border-med)", borderRadius: 6, cursor: "pointer",
          transition: "all 0.15s ease", boxSizing: "border-box",
        }}
      >
        <div style={{
          width: 18, height: 18, borderRadius: 5, flexShrink: 0,
          background: value ? "rgba(28,28,26,0.06)" : "var(--surface-2)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: "9px", fontWeight: 700, color: value ? "var(--ink)" : "var(--ink-subtle)", textTransform: "uppercase" }}>
            {value ? (value === "*" ? "*" : value.charAt(0)) : "?"}
          </span>
        </div>
        <span style={{ flex: 1, fontSize: 13, color: value ? "var(--ink)" : "var(--ink-subtle)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {value || "Select workspace"}
        </span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}>
          <path d="M3 4.5L6 7.5L9 4.5" stroke="var(--ink-subtle)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: "var(--white)", border: "1px solid var(--border-med)",
          borderRadius: 9, padding: 4, boxShadow: "0 8px 32px rgba(28,28,26,0.12)",
          zIndex: 10, maxHeight: 220, overflowY: "auto",
        }}>
          {allOptions.map((ws) => {
            const isSelected = ws === value;
            const isHov = hoveredItem === ws;
            return (
              <div
                key={ws} role="button" tabIndex={0}
                onClick={() => { onChange(ws); setOpen(false); }}
                onKeyDown={(e) => { if (e.key === "Enter") { onChange(ws); setOpen(false); } }}
                onMouseEnter={() => setHoveredItem(ws)}
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
                <div style={{
                  width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                  background: isSelected ? "rgba(192,61,20,0.1)" : "var(--surface-2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", color: isSelected ? "var(--ink)" : "var(--ink-subtle)" }}>
                    {ws === "*" ? "*" : ws.charAt(0)}
                  </span>
                </div>
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ws}</span>
                {isSelected && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RolePickerDropdown({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [open, setOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<number | null>(null);
  const [hoveredTrigger, setHoveredTrigger] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = ROLE_OPTIONS.find((o) => o.value === value) ?? ROLE_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <span style={fieldLabelStyle}>Role</span>
      <div
        role="button" tabIndex={0}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setOpen(!open); }}
        onMouseEnter={() => setHoveredTrigger(true)}
        onMouseLeave={() => setHoveredTrigger(false)}
        style={{
          display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "7px 10px",
          background: open ? "var(--surface-2)" : hoveredTrigger ? "var(--surface)" : "var(--white)",
          border: "1px solid var(--border-med)", borderRadius: 6, cursor: "pointer",
          transition: "all 0.15s ease", boxSizing: "border-box",
        }}
      >
        <span style={{ ...roleBadgeStyle, background: selected.bg, color: selected.color }}>{selected.label}</span>
        <span style={{ flex: 1 }} />
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}>
          <path d="M3 4.5L6 7.5L9 4.5" stroke="var(--ink-subtle)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: "var(--white)", border: "1px solid var(--border-med)",
          borderRadius: 9, padding: 4, boxShadow: "0 8px 32px rgba(28,28,26,0.12)", zIndex: 10,
        }}>
          {ROLE_OPTIONS.map((opt) => {
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
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 9px", borderRadius: 6,
                  cursor: "pointer", transition: "background 0.12s",
                  background: isSelected ? "var(--surface)" : isHov ? "var(--surface)" : "transparent",
                }}
              >
                <span style={{ ...roleBadgeStyle, background: opt.bg, color: opt.color }}>{opt.label}</span>
                <span style={{ fontSize: 11, color: "var(--ink-subtle)", flex: 1 }}>{opt.description}</span>
                {isSelected && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ManageRolesModal({ open, onClose, user }: { open: boolean; onClose: () => void; user: User }) {
  const { toast } = useToast();
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [workspaces, setWorkspaces] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState("");
  const [newRole, setNewRole] = useState(ROLE_VIEWER);
  const [adding, setAdding] = useState(false);
  const [removingWs, setRemovingWs] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([api.getUserRoles(user.id), api.listWorkspaces()])
      .then(([rolesRes, wsRes]) => {
        setRoles(Array.isArray(rolesRes) ? rolesRes : rolesRes.data || []);
        const wsList = Array.isArray(wsRes) ? wsRes : wsRes.data || [];
        setWorkspaces(wsList.map((ws: { name: string }) => ws.name));
      })
      .catch((err) => toast("Error", err.message, "error"))
      .finally(() => setLoading(false));
  }, [open, user.id, toast]);

  const handleAdd = async () => {
    if (!newWorkspace) return;
    setAdding(true);
    try {
      await api.setUserRole(user.id, newWorkspace, newRole);
      const res = await api.getUserRoles(user.id);
      setRoles(Array.isArray(res) ? res : res.data || []);
      setNewWorkspace("");
      setNewRole(ROLE_VIEWER);
      toast("Role added", undefined, "success");
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast("Error", e.message, "error");
    }
    setAdding(false);
  };

  const handleRemove = async (workspace: string) => {
    setRemovingWs(workspace);
    try {
      await api.deleteUserRole(user.id, workspace);
      setRoles((prev) => prev.filter((r) => r.workspace !== workspace));
      toast("Role removed", undefined, "success");
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast("Error", e.message, "error");
    }
    setRemovingWs(null);
  };

  return (
    <Modal open={open} onClose={onClose} title="Manage roles" size="sm">
      <div style={{ marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--surface)", borderRadius: 8, marginBottom: 20 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(28,28,26,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", textTransform: "uppercase" }}>
              {user.email.charAt(0)}
            </span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user.email}
          </span>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={sectionLabelStyle}>Current roles</div>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[1, 2].map((i) => <Skeleton key={i} width="100%" height="44px" />)}
            </div>
          ) : roles.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--ink-subtle)", padding: "10px 0" }}>No roles assigned yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {roles.map((r) => {
                const roleOpt = ROLE_OPTIONS.find((o) => o.value === r.role_mask) ?? ROLE_OPTIONS[0];
                return (
                  <div key={r.workspace} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 12px", background: "var(--surface)", borderRadius: 8,
                    border: "1px solid var(--border)",
                  }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: 6, background: "var(--white)",
                      border: "1px solid var(--border-med)", display: "flex", alignItems: "center",
                      justifyContent: "center", flexShrink: 0,
                    }}>
                      <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--ink-subtle)", textTransform: "uppercase" }}>
                        {r.workspace === "*" ? "*" : r.workspace.charAt(0)}
                      </span>
                    </div>
                    <span style={{ fontSize: 12, color: "var(--ink)", flex: 1 }}>{r.workspace}</span>
                    <span style={{ ...roleBadgeStyle, background: roleOpt.bg, color: roleOpt.color }}>
                      {roleOpt.label}
                    </span>
                    <button
                      onClick={() => handleRemove(r.workspace)}
                      disabled={removingWs === r.workspace}
                      style={{
                        background: "none", border: "none", cursor: removingWs === r.workspace ? "not-allowed" : "pointer",
                        color: "var(--ink-subtle)", padding: "2px 4px", borderRadius: 4,
                        opacity: removingWs === r.workspace ? 0.4 : 1, flexShrink: 0,
                        display: "flex", alignItems: "center",
                      }}
                      onMouseEnter={(e) => { if (!removingWs) (e.currentTarget as HTMLElement).style.color = "#DC2626"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--ink-subtle)"; }}
                      title="Remove role"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ padding: "14px", background: "var(--surface)", borderRadius: 10, border: "1px solid var(--border)" }}>
          <div style={sectionLabelStyle}>Add role</div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <WorkspacePickerDropdown workspaces={workspaces} value={newWorkspace} onChange={setNewWorkspace} />
            </div>
            <div style={{ width: 148 }}>
              <RolePickerDropdown value={newRole} onChange={setNewRole} />
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <Button variant="primary" size="sm" onClick={handleAdd} loading={adding} disabled={!newWorkspace} style={{ width: "100%" }}>
              Add role
            </Button>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 12 }}>
        <Button variant="ghost" size="sm" onClick={onClose}>Done</Button>
      </div>
    </Modal>
  );
}

export default function AdminUsersPage() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [manageRolesUser, setManageRolesUser] = useState<User | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createEmailError, setCreateEmailError] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isAdmin) { router.replace("/admin/workspaces"); return; }
    api.listUsers()
      .then((res) => setUsers(Array.isArray(res) ? res : res.data || []))
      .catch((err) => toast("Error", err.message, "error"))
      .finally(() => setLoading(false));
  }, [isAdmin, router, toast]);

  function openCreate() {
    setCreateEmail(""); setCreateEmailError("");
    setShowCreate(true);
  }

  async function handleCreate() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createEmail)) {
      setCreateEmailError("Enter a valid email address");
      return;
    }
    setCreateEmailError("");
    setCreating(true);
    try {
      const user = await api.createUser(createEmail);
      setUsers((prev) => [...prev, user]);
      setShowCreate(false);
      toast("User added", undefined, "success");
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast("Error", e.message || "Failed to add user", "error");
    } finally {
      setCreating(false);
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteUser(deleteTarget.id);
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      toast("User removed", undefined, "success");
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast("Error", e.message, "error");
    }
    setDeleteTarget(null);
  };

  const columns: DataTableColumn<User>[] = [
    {
      key: "email",
      label: "Email",
      width: "1fr",
      sortable: true,
      searchable: true,
      value: u => u.email,
      render: (u) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
            background: "rgba(28,28,26,0.06)", border: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink)", textTransform: "uppercase" }}>
              {u.email.charAt(0)}
            </span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{u.email}</span>
        </div>
      ),
    },
    {
      key: "created",
      label: "Created",
      width: "140px",
      sortable: true,
      value: u => u.created_at,
      render: (u) => (
        <span style={{ fontSize: 11, color: "var(--ink-subtle)" }}>{timeAgo(u.created_at)}</span>
      ),
    },
    {
      key: "last_login",
      label: "Last login",
      width: "140px",
      sortable: true,
      value: u => u.last_login_at || "",
      render: (u) => (
        <span style={{ fontSize: 11, color: u.last_login_at ? "var(--ink-subtle)" : "var(--ink-subtle)", fontStyle: u.last_login_at ? "normal" : "italic" }}>
          {u.last_login_at ? timeAgo(u.last_login_at) : "Never"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      width: "160px",
      align: "right",
      render: (u) => (
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }} onClick={e => e.stopPropagation()}>
          <ActionBtn label="Manage" variant="manage" onClick={() => setManageRolesUser(u)} />
          {isAdmin && <ActionBtn label="Delete" variant="delete" onClick={() => setDeleteTarget(u)} />}
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
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.01em" }}>Users</span>
          {!loading && (
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-subtle)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 5, padding: "2px 7px" }}>
              {users.length}
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: "24px 28px" }}>
        <DataTable
          columns={columns}
          rows={users}
          rowKey={u => u.id}
          loading={loading}
          emptyTitle="No users yet"
          emptyDescription="Add users so they can sign in with their email."
          emptyAction={isAdmin ? <Button variant="primary" onClick={openCreate}>Add user</Button> : undefined}
          pageSize={10}
          addLabel="Add user"
          onAdd={isAdmin ? openCreate : undefined}
        />
      </div>

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Add user"
        footer={
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate} loading={creating}>Add</Button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Input
            label="Email"
            value={createEmail}
            onChange={e => setCreateEmail(e.target.value)}
            placeholder="user@example.com"
            error={createEmailError}
            hint="The user will be able to sign in with this email via OTP."
          />
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove user"
        message={`Remove ${deleteTarget?.email}? This cannot be undone.`}
        confirmLabel="Remove"
        variant="danger"
      />

      {manageRolesUser && (
        <ManageRolesModal
          open={!!manageRolesUser}
          onClose={() => setManageRolesUser(null)}
          user={manageRolesUser}
        />
      )}
    </div>
  );
}

function ActionBtn({ label, variant, onClick }: { label: string; variant: "manage" | "delete"; onClick: () => void }) {
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

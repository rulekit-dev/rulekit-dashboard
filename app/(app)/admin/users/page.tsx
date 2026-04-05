"use client";

import { useState, useEffect, useRef, CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { User, UserRole, roleName, ROLE_VIEWER, ROLE_EDITOR, ROLE_ADMIN } from "@/lib/types";
import * as api from "@/lib/api";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";
import PageHeader from "@/components/layout/PageHeader";
import Table, { TableRow, TableCell } from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/ConfirmModal";
import Modal from "@/components/ui/Modal";
import Skeleton from "@/components/ui/Skeleton";

function formatDate(s: string) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}


const ROLE_OPTIONS = [
  { value: ROLE_VIEWER, label: "Viewer", description: "Read-only access", color: "#2563EB", bg: "var(--blue-dim)" },
  { value: ROLE_EDITOR, label: "Editor", description: "Can edit rulesets", color: "#7C3AED", bg: "var(--purple-dim)" },
  { value: ROLE_ADMIN, label: "Admin", description: "Full access", color: "var(--orange-deep)", bg: "var(--orange-dim)" },
];

// --- Workspace picker dropdown (fixed-position so it escapes table clipping) ---

function WorkspacePickerDropdown({
  workspaces,
  value,
  onChange,
}: {
  workspaces: string[];
  value: string;
  onChange: (v: string) => void;
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
        role="button"
        tabIndex={0}
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
          background: value ? "var(--orange-dim)" : "var(--surface-2)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: "9px", fontWeight: 700, color: value ? "var(--orange-deep)" : "var(--ink-subtle)", textTransform: "uppercase" }}>
            {value ? (value === "*" ? "*" : value.charAt(0)) : "?"}
          </span>
        </div>
        <span style={{
          flex: 1, fontSize: 13, fontFamily: "var(--font-dm-mono)",
          color: value ? "var(--ink)" : "var(--ink-subtle)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
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
                key={ws}
                role="button"
                tabIndex={0}
                onClick={() => { onChange(ws); setOpen(false); }}
                onKeyDown={(e) => { if (e.key === "Enter") { onChange(ws); setOpen(false); } }}
                onMouseEnter={() => setHoveredItem(ws)}
                onMouseLeave={() => setHoveredItem(null)}
                style={{
                  display: "flex", alignItems: "center", gap: 9, fontSize: 13,
                  fontWeight: isSelected ? 600 : 500,
                  color: isSelected ? "var(--orange-deep)" : isHov ? "var(--ink)" : "var(--ink-muted)",
                  padding: "7px 9px", borderRadius: 6, cursor: "pointer",
                  background: isSelected ? "var(--orange-dim)" : isHov ? "var(--surface)" : "transparent",
                  transition: "background 0.12s, color 0.12s",
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                  background: isSelected ? "rgba(192,61,20,0.1)" : "var(--surface-2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", color: isSelected ? "var(--orange-deep)" : "var(--ink-subtle)" }}>
                    {ws === "*" ? "*" : ws.charAt(0)}
                  </span>
                </div>
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "var(--font-dm-mono)" }}>{ws}</span>
                {isSelected && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="var(--orange)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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

// --- Role picker dropdown ---

function RolePickerDropdown({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
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
        role="button"
        tabIndex={0}
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
        <span style={{ ...roleBadgeStyle, background: selected.bg, color: selected.color }}>
          {selected.label}
        </span>
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
                key={opt.value}
                role="button"
                tabIndex={0}
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
                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="var(--orange)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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

// --- Manage Roles Modal ---

function ManageRolesModal({
  open,
  onClose,
  user,
}: {
  open: boolean;
  onClose: () => void;
  user: User;
}) {
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
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--orange-dim)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--orange-deep)", textTransform: "uppercase" }}>
              {user.email.charAt(0)}
            </span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user.email}
          </span>
        </div>

        {/* Existing roles */}
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
                    <span style={{ fontFamily: "var(--font-dm-mono)", fontSize: 12, color: "var(--ink)", flex: 1 }}>
                      {r.workspace}
                    </span>
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

        {/* Add new role */}
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

// --- Main page ---

export default function AdminUsersPage() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [manageRolesUser, setManageRolesUser] = useState<User | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      router.replace("/admin/workspaces");
      return;
    }
    api
      .listUsers()
      .then((res) => setUsers(Array.isArray(res) ? res : res.data || []))
      .catch((err) => toast("Error", err.message, "error"))
      .finally(() => setLoading(false));
  }, [isAdmin, router, toast]);

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

  const headers = [
    { key: "email", label: "Email" },
    { key: "created", label: "Created", mono: true },
    { key: "last_login", label: "Last Login", mono: true },
    { key: "actions", label: "Actions", align: "right" },
  ];

  return (
    <div className="animate-fade-up">
      <PageHeader eyebrow="admin" title="Users" />

      <div style={{ padding: "24px 32px" }}>
        <div style={{ fontSize: "13px", color: "var(--ink-muted)", marginBottom: "16px" }}>
          {!loading && `${users.length} user${users.length !== 1 ? "s" : ""}`}
        </div>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[1, 2, 3].map((i) => <Skeleton key={i} width="100%" height="48px" />)}
          </div>
        ) : (
          <Table headers={headers} emptyMessage="No users yet.">
            {users.map((user, i) => (
              <UserRow
                key={user.id}
                user={user}
                index={i}
                onManageRoles={() => setManageRolesUser(user)}
                onDelete={() => setDeleteTarget(user)}
              />
            ))}
          </Table>
        )}
      </div>

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

function UserRow({
  user,
  index,
  onManageRoles,
  onDelete,
}: {
  user: User;
  index: number;
  onManageRoles: () => void;
  onDelete: () => void;
}) {
  return (
    <TableRow>
      <TableCell primary>
        <span
          className="animate-row"
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          {user.email}
        </span>
      </TableCell>
      <TableCell mono>{formatDate(user.created_at)}</TableCell>
      <TableCell mono>{formatDate(user.last_login_at)}</TableCell>
      <TableCell align="right">
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <Button variant="ghost" size="sm" onClick={onManageRoles}>Manage</Button>
          <Button variant="danger" size="sm" onClick={onDelete}>Delete</Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

// --- Shared styles ---

const fieldLabelStyle: CSSProperties = {
  fontFamily: "var(--font-nunito)",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--ink-muted)",
  display: "block",
  marginBottom: 4,
};

const roleBadgeStyle: CSSProperties = {
  fontFamily: "var(--font-nunito)",
  fontSize: 11,
  fontWeight: 600,
  padding: "2px 10px",
  borderRadius: 12,
  display: "inline-block",
  whiteSpace: "nowrap",
};

const sectionLabelStyle: CSSProperties = {
  fontFamily: "var(--font-nunito)",
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "var(--ink-subtle)",
  marginBottom: 8,
};

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, UserRole, roleName, ROLE_VIEWER, ROLE_EDITOR, ROLE_ADMIN } from "@/lib/types";
import * as api from "@/lib/api";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";
import PageHeader from "@/components/layout/PageHeader";
import Table, { TableRow, TableCell } from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import ConfirmModal from "@/components/ui/ConfirmModal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Skeleton from "@/components/ui/Skeleton";

function formatDate(s: string) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function roleBadgeVariant(mask: number): "orange" | "blue" | "purple" {
  if (mask >= ROLE_ADMIN) return "orange";
  if (mask >= ROLE_EDITOR) return "purple";
  return "blue";
}

export default function AdminUsersPage() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      router.replace("/admin/workspaces");
      return;
    }
    api
      .listUsers()
      .then((res) => setUsers(Array.isArray(res) ? res : Array.isArray(res) ? res : res.data || []))
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
        <div
          style={{
            
            fontSize: "13px",
            color: "var(--ink-muted)",
            marginBottom: "16px",
          }}
        >
          {!loading && `${users.length} user${users.length !== 1 ? "s" : ""}`}
        </div>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} width="100%" height="48px" />
            ))}
          </div>
        ) : (
          <Table
            headers={headers}
            emptyMessage="No users yet."
          >
            {users.map((user, i) => (
              <UserRow
                key={user.id}
                user={user}
                index={i}
                expanded={expandedUserId === user.id}
                onToggle={() =>
                  setExpandedUserId(
                    expandedUserId === user.id ? null : user.id
                  )
                }
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
    </div>
  );
}

function UserRow({
  user,
  index,
  expanded,
  onToggle,
  onDelete,
}: {
  user: User;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <TableRow>
        <TableCell primary>
          <span
            onClick={onToggle}
            className="animate-row"
            style={{
              cursor: "pointer",
              animationDelay: `${index * 0.05}s`,
              textDecoration: "none",
            }}
          >
            {user.email}
          </span>
        </TableCell>
        <TableCell mono>{formatDate(user.created_at)}</TableCell>
        <TableCell mono>{formatDate(user.last_login_at)}</TableCell>
        <TableCell align="right">
          <Button variant="danger" size="sm" onClick={onDelete}>
            Delete
          </Button>
        </TableCell>
      </TableRow>
      {expanded && (
        <tr>
          <td colSpan={4} style={{ padding: 0 }}>
            <RolesPanel userId={user.id} />
          </td>
        </tr>
      )}
    </>
  );
}

function RolesPanel({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [newWorkspace, setNewWorkspace] = useState("");
  const [newRole, setNewRole] = useState("1");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    api
      .getUserRoles(userId)
      .then((res) => setRoles(Array.isArray(res) ? res : res.data || []))
      .catch((err) => toast("Error", err.message, "error"))
      .finally(() => setLoading(false));
  }, [userId, toast]);

  const handleAdd = async () => {
    if (!newWorkspace) return;
    if (newWorkspace !== "*" && !/^[a-z0-9_-]{1,128}$/.test(newWorkspace)) {
      toast("Invalid workspace", 'Must be [a-z0-9_-] or "*"', "error");
      return;
    }
    setAdding(true);
    try {
      await api.setUserRole(userId, newWorkspace, parseInt(newRole));
      const res = await api.getUserRoles(userId);
      setRoles(Array.isArray(res) ? res : res.data || []);
      setNewWorkspace("");
      toast("Role added", undefined, "success");
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast("Error", e.message, "error");
    }
    setAdding(false);
  };

  const handleDeleteRole = async (workspace: string) => {
    try {
      await api.deleteUserRole(userId, workspace);
      setRoles((prev) => prev.filter((r) => r.workspace !== workspace));
      toast("Role removed", undefined, "success");
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast("Error", e.message, "error");
    }
  };

  if (loading) return <div style={{ padding: 16 }}><Skeleton width="100%" height="60px" /></div>;

  return (
    <div
      style={{
        padding: "12px 20px 16px",
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          color: "var(--ink-subtle)",
          marginBottom: 8,
        }}
      >
        Roles
      </div>

      {roles.length === 0 && (
        <div
          style={{
            
            fontSize: 13,
            color: "var(--ink-subtle)",
            marginBottom: 12,
          }}
        >
          No roles assigned.
        </div>
      )}

      {roles.map((r) => (
        <div
          key={r.workspace}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 6,
            padding: "4px 0",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-nunito)",
              fontSize: 13,
              color: "var(--ink)",
              minWidth: 100,
            }}
          >
            {r.workspace}
          </span>
          <Badge variant={roleBadgeVariant(r.role_mask)}>
            {roleName(r.role_mask)}
          </Badge>
          <Button variant="danger" size="sm" onClick={() => handleDeleteRole(r.workspace)}>
            Remove
          </Button>
        </div>
      ))}

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 8,
          marginTop: 12,
        }}
      >
        <div style={{ flex: 1 }}>
          <Input
            label="Workspace"
            value={newWorkspace}
            onChange={(e) => setNewWorkspace(e.target.value)}
            placeholder='e.g. "production" or "*"'
            mono
          />
        </div>
        <div style={{ width: 120 }}>
          <Select
            label="Role"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            options={[
              { value: String(ROLE_VIEWER), label: "Viewer" },
              { value: String(ROLE_EDITOR), label: "Editor" },
              { value: String(ROLE_ADMIN), label: "Admin" },
            ]}
          />
        </div>
        <Button variant="primary" size="sm" onClick={handleAdd} loading={adding}>
          Add
        </Button>
      </div>
    </div>
  );
}

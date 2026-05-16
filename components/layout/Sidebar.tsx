"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { createWorkspace } from "@/lib/api";
import {
  Home,
  BookOpen,
  Layers,
  Users,
  KeyRound,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from "lucide-react";

interface SidebarProps {
  workspaces: string[];
  selectedWorkspace: string | null;
  onSelectWorkspace: (ws: string) => void;
  onWorkspaceCreated?: (name: string) => void;
  currentPath: string;
  userEmail: string;
  isAdmin: boolean;
  onLogout: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
}

function Logo({ size = 24 }: { size?: number }) {
  const r = Math.round(size * (13 / 64));
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx={r * 4} fill="#111" />
      <text
        x="32" y="44"
        fontFamily="Space Grotesk, system-ui, sans-serif"
        fontWeight="700"
        fontSize="38"
        fill="#fff"
        textAnchor="middle"
        dominantBaseline="auto"
      >R</text>
    </svg>
  );
}

function NavLink({
  item,
  currentPath,
  collapsed,
}: {
  item: NavItem;
  currentPath: string;
  collapsed: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const Icon = item.icon;
  const isActive = item.exact
    ? currentPath === item.href
    : currentPath === item.href || currentPath.startsWith(item.href + "/");

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "9px",
        fontSize: "13px",
        fontWeight: isActive ? 600 : 500,
        color: isActive ? "var(--ink)" : hovered ? "var(--ink)" : "var(--ink-muted)",
        padding: collapsed ? "8px 0" : "7px 16px",
        justifyContent: collapsed ? "center" : "flex-start",
        cursor: "pointer",
        textDecoration: "none",
        borderLeft: collapsed
          ? "none"
          : isActive
            ? "2px solid var(--ink)"
            : "2px solid transparent",
        background: isActive
          ? "rgba(28,28,26,0.05)"
          : hovered
            ? "rgba(28,28,26,0.03)"
            : "transparent",
        borderRadius: collapsed ? "8px" : 0,
        margin: collapsed ? "2px 8px" : 0,
        transition: "background 0.12s, color 0.12s",
        letterSpacing: "-0.01em",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Icon
        size={15}
        strokeWidth={isActive ? 2.2 : 1.8}
        style={{ flexShrink: 0 }}
      />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}

const NAME_RE = /^[a-z0-9_-]{1,128}$/;

function AddWorkspaceModal({ onClose, onCreated }: { onClose: () => void; onCreated: (name: string) => void }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [nameError, setNameError] = useState("");
  const [creating, setCreating] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleCreate() {
    if (!NAME_RE.test(name)) { setNameError("Lowercase letters, numbers, hyphens, underscores only (1-128 chars)"); return; }
    setNameError("");
    setCreating(true);
    try {
      await createWorkspace(name, desc);
      onCreated(name);
    } catch {
      setNameError("Failed to create workspace. Name may already be taken.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(28,28,26,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div style={{
        background: "var(--white)", borderRadius: 14,
        border: "1px solid var(--border-med)",
        boxShadow: "0 24px 64px rgba(28,28,26,0.18)",
        width: 400, padding: "24px",
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em", marginBottom: 18 }}>
          New workspace
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Name field */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-muted)", display: "block", marginBottom: 5 }}>
              Name
            </label>
            <input
              autoFocus
              value={name}
              onChange={e => { setName(e.target.value); setNameError(""); }}
              onKeyDown={e => { if (e.key === "Enter") handleCreate(); }}
              placeholder="my-workspace"
              style={{
                width: "100%", boxSizing: "border-box",
                fontFamily: "var(--font-sans)", fontSize: 13,
                padding: "8px 12px",
                background: "var(--white)",
                border: `1px solid ${nameError ? "var(--red)" : "var(--border-med)"}`,
                borderRadius: 8, outline: "none", color: "var(--ink)",
                transition: "border-color 0.15s",
              }}
              onFocus={e => { if (!nameError) e.currentTarget.style.borderColor = "var(--ink)"; }}
              onBlur={e => { if (!nameError) e.currentTarget.style.borderColor = "var(--border-med)"; }}
            />
            {nameError ? (
              <div style={{ fontSize: 11, color: "var(--red)", marginTop: 4 }}>{nameError}</div>
            ) : (
              <div style={{ fontSize: 11, color: "var(--ink-subtle)", marginTop: 4 }}>Lowercase letters, numbers, hyphens, underscores</div>
            )}
          </div>

          {/* Description field */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-muted)", display: "block", marginBottom: 5 }}>
              Description <span style={{ fontWeight: 400, color: "var(--ink-subtle)" }}>(optional)</span>
            </label>
            <input
              value={desc}
              onChange={e => setDesc(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleCreate(); }}
              placeholder="What this workspace is for"
              style={{
                width: "100%", boxSizing: "border-box",
                fontFamily: "var(--font-sans)", fontSize: 13,
                padding: "8px 12px",
                background: "var(--white)",
                border: "1px solid var(--border-med)",
                borderRadius: 8, outline: "none", color: "var(--ink)",
                transition: "border-color 0.15s",
              }}
              onFocus={e => (e.currentTarget.style.borderColor = "var(--ink)")}
              onBlur={e => (e.currentTarget.style.borderColor = "var(--border-med)")}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
          <button
            onClick={onClose}
            style={{
              fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500,
              padding: "7px 14px", borderRadius: 8,
              border: "1px solid var(--border-med)", background: "transparent",
              color: "var(--ink-muted)", cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating}
            style={{
              fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600,
              padding: "7px 16px", borderRadius: 8,
              border: "none", background: creating ? "var(--ink-subtle)" : "var(--ink)",
              color: "#fff", cursor: creating ? "default" : "pointer",
              transition: "opacity 0.15s",
              opacity: creating ? 0.7 : 1,
            }}
          >
            {creating ? "Creating…" : "Create workspace"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 12 12"
      fill="none"
      style={{
        flexShrink: 0,
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 0.2s ease",
      }}
    >
      <path
        d="M3 4.5L6 7.5L9 4.5"
        stroke="var(--ink-subtle)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WorkspaceDropdown({
  workspaces,
  selected,
  onSelect,
  onAdd,
  isAdmin,
  collapsed,
}: {
  workspaces: string[];
  selected: string | null;
  onSelect: (ws: string) => void;
  onAdd?: () => void;
  isAdmin: boolean;
  collapsed: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [hoveredTrigger, setHoveredTrigger] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [addHovered, setAddHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} style={{ padding: collapsed ? "12px 8px 0" : "12px 12px 0" }}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setOpen(!open);
        }}
        onMouseEnter={() => setHoveredTrigger(true)}
        onMouseLeave={() => setHoveredTrigger(false)}
        title={collapsed ? (selected || "Select workspace") : undefined}
        style={{
          display: "flex",
          alignItems: "center",
          gap: collapsed ? "0" : "9px",
          justifyContent: collapsed ? "center" : "flex-start",
          width: "100%",
          padding: collapsed ? "8px" : "8px 10px",
          background: open
            ? "var(--surface-2)"
            : hoveredTrigger
              ? "var(--surface)"
              : "transparent",
          border: "1px solid",
          borderColor: open || hoveredTrigger ? "var(--border-med)" : "var(--border)",
          borderRadius: "9px",
          cursor: "pointer",
          transition: "all 0.12s ease",
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: 5,
            background: selected ? "rgba(28,28,26,0.08)" : "var(--surface-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: "9px",
              fontWeight: 700,
              color: selected ? "var(--ink)" : "var(--ink-subtle)",
              textTransform: "uppercase",
              fontFamily: "var(--font-sans)",
            }}
          >
            {selected ? selected.charAt(0) : "?"}
          </span>
        </div>

        {!collapsed && (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: selected ? "var(--ink)" : "var(--ink-subtle)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  letterSpacing: "-0.01em",
                  fontFamily: "var(--font-sans)",
                }}
              >
                {selected || "Select workspace"}
              </div>
            </div>
            <ChevronIcon open={open} />
          </>
        )}
      </div>

      {open && (
        <div
          style={{
            marginTop: "4px",
            background: "var(--white)",
            border: "1px solid var(--border-med)",
            borderRadius: "10px",
            padding: "4px",
            maxHeight: "240px",
            overflowY: "auto",
            boxShadow: "0 8px 32px rgba(28,28,26,0.10), 0 2px 6px rgba(28,28,26,0.04)",
            position: collapsed ? "absolute" : "relative",
            left: collapsed ? "52px" : undefined,
            top: collapsed ? "auto" : undefined,
            minWidth: collapsed ? "200px" : undefined,
            zIndex: collapsed ? 200 : undefined,
          }}
        >
          {workspaces.length === 0 ? (
            <div style={{ fontSize: "12px", color: "var(--ink-subtle)", padding: "12px 8px", textAlign: "center" }}>
              No workspaces
            </div>
          ) : (
            workspaces.map((ws) => {
              const isSelected = ws === selected;
              const isHovered = hoveredItem === ws;
              return (
                <div
                  key={ws}
                  role="button"
                  tabIndex={0}
                  onClick={() => { onSelect(ws); setOpen(false); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { onSelect(ws); setOpen(false); } }}
                  onMouseEnter={() => setHoveredItem(ws)}
                  onMouseLeave={() => setHoveredItem(null)}
                  style={{
                    display: "flex", alignItems: "center", gap: "9px",
                    fontSize: "13px", fontWeight: isSelected ? 600 : 500,
                    color: isSelected ? "var(--ink)" : isHovered ? "var(--ink)" : "var(--ink-muted)",
                    padding: "7px 9px", borderRadius: "7px", cursor: "pointer",
                    background: isSelected ? "rgba(28,28,26,0.06)" : isHovered ? "var(--surface)" : "transparent",
                    transition: "background 0.1s, color 0.1s",
                    fontFamily: "var(--font-sans)", letterSpacing: "-0.01em",
                  }}
                >
                  <div style={{
                    width: 17, height: 17, borderRadius: 4,
                    background: isSelected ? "rgba(28,28,26,0.1)" : "var(--surface-2)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <span style={{ fontSize: "8px", fontWeight: 700, color: isSelected ? "var(--ink)" : "var(--ink-subtle)", textTransform: "uppercase" }}>
                      {ws.charAt(0)}
                    </span>
                  </div>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ws}</span>
                  {isSelected && (
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
                      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              );
            })
          )}

          {/* Add workspace button — admin only */}
          {isAdmin && onAdd && (
            <>
              <div style={{ margin: "4px 0", height: 1, background: "var(--border)" }} />
              <div
                role="button"
                tabIndex={0}
                onClick={() => { setOpen(false); onAdd(); }}
                onKeyDown={(e) => { if (e.key === "Enter") { setOpen(false); onAdd(); } }}
                onMouseEnter={() => setAddHovered(true)}
                onMouseLeave={() => setAddHovered(false)}
                style={{
                  display: "flex", alignItems: "center", gap: "9px",
                  fontSize: "12px", fontWeight: 600,
                  color: addHovered ? "var(--ink)" : "var(--ink-muted)",
                  padding: "7px 9px", borderRadius: "7px", cursor: "pointer",
                  background: addHovered ? "var(--surface)" : "transparent",
                  transition: "background 0.1s, color 0.1s",
                  fontFamily: "var(--font-sans)", letterSpacing: "-0.01em",
                }}
              >
                <div style={{
                  width: 17, height: 17, borderRadius: 4,
                  background: addHovered ? "rgba(28,28,26,0.08)" : "var(--surface-2)",
                  border: "1px dashed var(--border-med)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  transition: "background 0.1s",
                }}>
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M4 1v6M1 4h6" stroke="var(--ink-subtle)" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                </div>
                New workspace
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({
  workspaces,
  selectedWorkspace,
  onSelectWorkspace,
  onWorkspaceCreated,
  currentPath,
  userEmail,
  isAdmin,
  onLogout,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const [logoutHovered, setLogoutHovered] = useState(false);
  const [collapseHovered, setCollapseHovered] = useState(false);
  const [showAddWorkspace, setShowAddWorkspace] = useState(false);

  const workspaceNavItems: NavItem[] = selectedWorkspace
    ? [
        { label: "Home", href: `/${selectedWorkspace}/home`, icon: Home, exact: true },
        { label: "Rulesets", href: `/${selectedWorkspace}/rulesets`, icon: BookOpen },
      ]
    : [];

  const adminItems: NavItem[] = [
    { label: "Workspaces", href: "/admin/workspaces", icon: Layers, exact: true },
    { label: "Users", href: "/admin/users", icon: Users },
    { label: "API Keys", href: "/admin/keys", icon: KeyRound },
  ];

  const sidebarWidth = collapsed ? 60 : 232;

  return (
    <nav
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: `${sidebarWidth}px`,
        height: "100vh",
        background: "var(--white)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        zIndex: 100,
        transition: "width 0.2s ease",
      }}
    >
      {/* Logo + collapse */}
      <div
        style={{
          padding: collapsed ? "18px 0 4px" : "18px 16px 4px",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
        }}
      >
        {!collapsed && (
          <Link href="/admin/workspaces" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "8px" }}>
            <Logo size={22} />
            <span style={{ fontWeight: 700, fontSize: "15px", color: "var(--ink)", letterSpacing: "-0.03em" }}>
              rulekit
            </span>
          </Link>
        )}
        {collapsed && <Logo size={22} />}
        <button
          onClick={onToggleCollapse}
          onMouseEnter={() => setCollapseHovered(true)}
          onMouseLeave={() => setCollapseHovered(false)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            display: collapsed ? "none" : "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 26,
            height: 26,
            borderRadius: 6,
            border: "none",
            background: collapseHovered ? "var(--surface-2)" : "transparent",
            color: "var(--ink-subtle)",
            cursor: "pointer",
            transition: "background 0.12s",
          }}
        >
          <PanelLeftClose size={14} strokeWidth={1.8} />
        </button>
      </div>

      {collapsed && (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: "4px" }}>
          <button
            onClick={onToggleCollapse}
            onMouseEnter={() => setCollapseHovered(true)}
            onMouseLeave={() => setCollapseHovered(false)}
            title="Expand sidebar"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 26,
              height: 26,
              borderRadius: 6,
              border: "none",
              background: collapseHovered ? "var(--surface-2)" : "transparent",
              color: "var(--ink-subtle)",
              cursor: "pointer",
              transition: "background 0.12s",
            }}
          >
            <PanelLeftOpen size={14} strokeWidth={1.8} />
          </button>
        </div>
      )}

      {/* Workspace selector */}
      <WorkspaceDropdown
        workspaces={workspaces}
        selected={selectedWorkspace}
        onSelect={onSelectWorkspace}
        onAdd={isAdmin ? () => setShowAddWorkspace(true) : undefined}
        isAdmin={isAdmin}
        collapsed={collapsed}
      />

      {/* Add workspace modal */}
      {showAddWorkspace && (
        <AddWorkspaceModal
          onClose={() => setShowAddWorkspace(false)}
          onCreated={(name) => {
            setShowAddWorkspace(false);
            onWorkspaceCreated?.(name);
          }}
        />
      )}

      {/* Nav links */}
      <div style={{ flex: 1, overflowY: "auto", marginTop: 6 }}>
        {selectedWorkspace && workspaceNavItems.length > 0 && (
          <div>
            {workspaceNavItems.map((item) => (
              <NavLink key={item.href} item={item} currentPath={currentPath} collapsed={collapsed} />
            ))}
          </div>
        )}

        {isAdmin && (
          <div>
            {!collapsed && (
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  color: "var(--ink-subtle)",
                  letterSpacing: "0.06em",
                  padding: "18px 16px 5px",
                  fontFamily: "var(--font-sans)",
                }}
              >
                Admin
              </div>
            )}
            {collapsed && <div style={{ height: 14 }} />}
            {adminItems.map((item) => (
              <NavLink key={item.href} item={item} currentPath={currentPath} collapsed={collapsed} />
            ))}
          </div>
        )}
      </div>

      {/* User footer */}
      <div
        style={{
          borderTop: "1px solid var(--border)",
          padding: collapsed ? "10px 8px" : "10px 12px",
        }}
      >
        {collapsed ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
            <div
              title={userEmail}
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: "var(--surface-2)",
                border: "1px solid var(--border-med)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase" }}>
                {userEmail.charAt(0)}
              </span>
            </div>
            <span
              role="button"
              tabIndex={0}
              onClick={onLogout}
              onKeyDown={(e) => { if (e.key === "Enter") onLogout(); }}
              title="Sign out"
              onMouseEnter={() => setLogoutHovered(true)}
              onMouseLeave={() => setLogoutHovered(false)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 30,
                height: 30,
                borderRadius: 7,
                background: logoutHovered ? "var(--surface-2)" : "transparent",
                color: logoutHovered ? "var(--ink-muted)" : "var(--ink-subtle)",
                cursor: "pointer",
                transition: "background 0.12s, color 0.12s",
              }}
            >
              <LogOut size={13} strokeWidth={1.8} />
            </span>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "9px",
              padding: "7px 8px",
              borderRadius: "9px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: "var(--surface-2)",
                border: "1px solid var(--border-med)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase" }}>
                {userEmail.charAt(0)}
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--ink)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  letterSpacing: "-0.01em",
                  fontFamily: "var(--font-sans)",
                }}
              >
                {userEmail.split("@")[0]}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--ink-subtle)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontFamily: "var(--font-sans)",
                }}
              >
                {userEmail}
              </div>
            </div>
            <span
              role="button"
              tabIndex={0}
              onClick={onLogout}
              onKeyDown={(e) => { if (e.key === "Enter") onLogout(); }}
              title="Sign out"
              onMouseEnter={() => setLogoutHovered(true)}
              onMouseLeave={() => setLogoutHovered(false)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                borderRadius: 7,
                background: logoutHovered ? "var(--surface-2)" : "transparent",
                color: logoutHovered ? "var(--red)" : "var(--ink-subtle)",
                cursor: "pointer",
                transition: "background 0.12s, color 0.12s",
                flexShrink: 0,
              }}
            >
              <LogOut size={13} strokeWidth={1.8} />
            </span>
          </div>
        )}
      </div>
    </nav>
  );
}

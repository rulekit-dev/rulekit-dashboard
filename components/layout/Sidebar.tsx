"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
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
        gap: "10px",
        fontSize: "13px",
        fontWeight: isActive ? 600 : 500,
        color: isActive
          ? "var(--orange-deep)"
          : hovered
            ? "var(--ink)"
            : "var(--ink-muted)",
        padding: collapsed ? "8px 0" : "7px 20px",
        justifyContent: collapsed ? "center" : "flex-start",
        cursor: "pointer",
        textDecoration: "none",
        borderLeft: collapsed
          ? "none"
          : isActive
            ? "2px solid var(--orange)"
            : "2px solid transparent",
        background: isActive
          ? "var(--orange-dim)"
          : hovered
            ? "rgba(28,28,26,0.04)"
            : "transparent",
        borderRadius: collapsed ? "8px" : 0,
        margin: collapsed ? "2px 8px" : 0,
        transition: "background 0.15s, color 0.15s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Icon
        size={16}
        strokeWidth={isActive ? 2.2 : 2}
        style={{ flexShrink: 0 }}
      />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
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
  collapsed,
}: {
  workspaces: string[];
  selected: string | null;
  onSelect: (ws: string) => void;
  collapsed: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [hoveredTrigger, setHoveredTrigger] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
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
    <div ref={ref} style={{ padding: collapsed ? "16px 8px 0" : "16px 14px 0" }}>
      {/* Trigger */}
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
          gap: collapsed ? "0" : "10px",
          justifyContent: collapsed ? "center" : "flex-start",
          width: "100%",
          padding: collapsed ? "9px" : "9px 11px",
          background: open
            ? "var(--surface-2)"
            : hoveredTrigger
              ? "var(--surface)"
              : "transparent",
          border: "1px solid",
          borderColor: open
            ? "var(--border-med)"
            : hoveredTrigger
              ? "var(--border-med)"
              : "var(--border)",
          borderRadius: "9px",
          cursor: "pointer",
          transition: "all 0.15s ease",
        }}
      >
        {/* Workspace icon */}
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            background: selected ? "var(--orange-dim)" : "var(--surface-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: "10px",
              fontWeight: 700,
              color: selected ? "var(--orange-deep)" : "var(--ink-subtle)",
              textTransform: "uppercase",
            }}
          >
            {selected ? selected.charAt(0) : "?"}
          </span>
        </div>

        {!collapsed && (
          <>
            {/* Label */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: selected ? "var(--ink)" : "var(--ink-subtle)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {selected || "Select workspace"}
              </div>
            </div>
            <ChevronIcon open={open} />
          </>
        )}
      </div>

      {/* Dropdown menu */}
      {open && (
        <div
          style={{
            marginTop: "4px",
            background: "var(--white)",
            border: "1px solid var(--border-med)",
            borderRadius: "9px",
            padding: "4px",
            maxHeight: "240px",
            overflowY: "auto",
            boxShadow: "0 8px 32px rgba(28,28,26,0.12)",
            position: collapsed ? "absolute" : "relative",
            left: collapsed ? "52px" : undefined,
            top: collapsed ? "auto" : undefined,
            minWidth: collapsed ? "200px" : undefined,
            zIndex: collapsed ? 200 : undefined,
          }}
        >
          {workspaces.length === 0 ? (
            <div
              style={{
                fontSize: "12px",
                color: "var(--ink-subtle)",
                padding: "12px 8px",
                textAlign: "center",
              }}
            >
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
                  onClick={() => {
                    onSelect(ws);
                    setOpen(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      onSelect(ws);
                      setOpen(false);
                    }
                  }}
                  onMouseEnter={() => setHoveredItem(ws)}
                  onMouseLeave={() => setHoveredItem(null)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "9px",
                    fontSize: "13px",
                    fontWeight: isSelected ? 600 : 500,
                    color: isSelected
                      ? "var(--orange-deep)"
                      : isHovered
                        ? "var(--ink)"
                        : "var(--ink-muted)",
                    padding: "7px 9px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    background: isSelected
                      ? "var(--orange-dim)"
                      : isHovered
                        ? "var(--surface)"
                        : "transparent",
                    transition: "background 0.12s, color 0.12s",
                  }}
                >
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 5,
                      background: isSelected
                        ? "rgba(192,61,20,0.1)"
                        : "var(--surface-2)",
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
                        color: isSelected
                          ? "var(--orange-deep)"
                          : "var(--ink-subtle)",
                        textTransform: "uppercase",
                      }}
                    >
                      {ws.charAt(0)}
                    </span>
                  </div>
                  <span
                    style={{
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {ws}
                  </span>
                  {isSelected && (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      style={{ flexShrink: 0 }}
                    >
                      <path
                        d="M2.5 6L5 8.5L9.5 3.5"
                        stroke="var(--orange)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
              );
            })
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
  currentPath,
  userEmail,
  isAdmin,
  onLogout,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const [logoutHovered, setLogoutHovered] = useState(false);
  const [collapseHovered, setCollapseHovered] = useState(false);

  const workspaceNavItems: NavItem[] = selectedWorkspace
    ? [
        {
          label: "Home",
          href: `/${selectedWorkspace}/home`,
          icon: Home,
          exact: true,
        },
        {
          label: "Rulesets",
          href: `/${selectedWorkspace}/rulesets`,
          icon: BookOpen,
        },
      ]
    : [];

  const adminItems: NavItem[] = [
    { label: "Workspaces", href: "/admin/workspaces", icon: Layers, exact: true },
    { label: "Users", href: "/admin/users", icon: Users },
    { label: "API Keys", href: "/admin/keys", icon: KeyRound },
  ];

  const sidebarWidth = collapsed ? 60 : 240;

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
          padding: collapsed ? "20px 0 4px" : "20px 20px 4px",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
        }}
      >
        {!collapsed && (
          <Link href="/admin/workspaces" style={{ textDecoration: "none" }}>
            <span
              style={{
                fontWeight: 800,
                fontSize: "18px",
                color: "var(--ink)",
              }}
            >
              rulekit
              <span style={{ color: "var(--orange)" }}>.</span>
            </span>
          </Link>
        )}
        <button
          onClick={onToggleCollapse}
          onMouseEnter={() => setCollapseHovered(true)}
          onMouseLeave={() => setCollapseHovered(false)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: 6,
            border: "none",
            background: collapseHovered ? "var(--surface)" : "transparent",
            color: "var(--ink-subtle)",
            cursor: "pointer",
            transition: "background 0.15s, color 0.15s",
          }}
        >
          {collapsed ? (
            <PanelLeftOpen size={16} strokeWidth={2} />
          ) : (
            <PanelLeftClose size={16} strokeWidth={2} />
          )}
        </button>
      </div>

      {/* Workspace selector */}
      <WorkspaceDropdown
        workspaces={workspaces}
        selected={selectedWorkspace}
        onSelect={onSelectWorkspace}
        collapsed={collapsed}
      />

      {/* Nav links */}
      <div style={{ flex: 1, overflowY: "auto", marginTop: 8 }}>
        {selectedWorkspace && workspaceNavItems.length > 0 && (
          <div>
            {workspaceNavItems.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                currentPath={currentPath}
                collapsed={collapsed}
              />
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
                  letterSpacing: "0.04em",
                  padding: "20px 20px 6px",
                }}
              >
                Admin
              </div>
            )}
            {collapsed && <div style={{ height: 16 }} />}
            {adminItems.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                currentPath={currentPath}
                collapsed={collapsed}
              />
            ))}
          </div>
        )}
      </div>

      {/* User footer */}
      <div
        style={{
          borderTop: "1px solid var(--border)",
          padding: collapsed ? "12px 8px" : "12px 14px",
        }}
      >
        {collapsed ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
            <div
              title={userEmail}
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "var(--orange-dim)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--orange-deep)", textTransform: "uppercase" }}>
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
                width: 32,
                height: 32,
                borderRadius: 8,
                background: logoutHovered ? "var(--surface)" : "transparent",
                color: logoutHovered ? "var(--ink-muted)" : "var(--ink-subtle)",
                cursor: "pointer",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              <LogOut size={15} strokeWidth={2} />
            </span>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "8px",
              borderRadius: "10px",
              background: "var(--surface)",
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "var(--orange-dim)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--orange-deep)", textTransform: "uppercase" }}>
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
                }}
              >
                {userEmail.split("@")[0]}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 400,
                  color: "var(--ink-subtle)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
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
                width: 30,
                height: 30,
                borderRadius: 8,
                background: logoutHovered ? "var(--surface-2)" : "transparent",
                color: logoutHovered ? "#DC2626" : "var(--ink-subtle)",
                cursor: "pointer",
                transition: "background 0.15s, color 0.15s",
                flexShrink: 0,
              }}
            >
              <LogOut size={15} strokeWidth={2} />
            </span>
          </div>
        )}
      </div>
    </nav>
  );
}

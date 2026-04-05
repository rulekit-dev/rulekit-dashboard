"use client";

import { ReactNode, useEffect, useState, useCallback, CSSProperties } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";
import { listWorkspaces } from "@/lib/api";
import Sidebar from "./Sidebar";
import Onboarding from "./Onboarding";

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const { user, isAdmin, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<string[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(
    null
  );
  const [wsLoading, setWsLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const fetchWorkspaces = useCallback(async () => {
    try {
      const res = await listWorkspaces();
      const list = Array.isArray(res) ? res : res.data || [];
      const names = list.map((ws: { name: string }) => ws.name);
      setWorkspaces(names);
      return names;
    } catch {
      setWorkspaces([]);
      return [];
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    setWsLoading(true);
    fetchWorkspaces().then((names) => {
      // Detect workspace from URL (e.g. /my-workspace/home or /my-workspace/rulesets)
      const match = pathname.match(/^\/([^/]+)\/(home|rulesets)/);
      if (match && names.includes(match[1])) {
        setSelectedWorkspace(match[1]);
      } else if (names.length > 0 && !selectedWorkspace) {
        setSelectedWorkspace(names[0]);
      }
      setWsLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, fetchWorkspaces]);

  // Sync selected workspace when URL changes
  useEffect(() => {
    const match = pathname.match(/^\/([^/]+)\/(home|rulesets)/);
    if (match && workspaces.includes(match[1])) {
      setSelectedWorkspace(match[1]);
    }
  }, [pathname, workspaces]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  const handleSelectWorkspace = (ws: string) => {
    setSelectedWorkspace(ws);
    router.push(`/${ws}/home`);
  };

  const handleOnboardingComplete = async () => {
    const names = await fetchWorkspaces();
    if (names.length > 0) {
      setSelectedWorkspace(names[0]);
      router.push(`/${names[0]}/home`);
    }
  };

  if (loading || wsLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "var(--surface)",
        }}
      >
        <style>{`
          @keyframes dotPulse {
            0%, 100% { transform: scale(0.6); opacity: 0.4; }
            50% { transform: scale(1); opacity: 1; }
          }
        `}</style>
        <div
          style={{
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            background: "var(--orange)",
            animation: "dotPulse 1.2s ease-in-out infinite",
          }}
        />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Show onboarding if no workspaces exist
  if (workspaces.length === 0) {
    if (!isAdmin) {
      return <NoAccessScreen userEmail={user.email} onLogout={logout} />;
    }
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  const sidebarWidth = sidebarCollapsed ? 60 : 240;

  return (
    <div>
      <Sidebar
        workspaces={workspaces}
        selectedWorkspace={selectedWorkspace}
        onSelectWorkspace={handleSelectWorkspace}
        currentPath={pathname}
        userEmail={user.email}
        isAdmin={isAdmin}
        onLogout={logout}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
      />
      <main
        style={{
          marginLeft: `${sidebarWidth}px`,
          background: "var(--white)",
          minHeight: "100vh",
          transition: "margin-left 0.2s ease",
        }}
      >
        {children}
      </main>
    </div>
  );
}

function NoAccessScreen({ userEmail, onLogout }: { userEmail: string; onLogout: () => void }) {
  const pageStyle: CSSProperties = {
    minHeight: "100vh",
    background: "var(--surface)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
  };

  const cardStyle: CSSProperties = {
    background: "var(--white)",
    width: "440px",
    padding: "36px",
    borderRadius: "14px",
    boxShadow: "0 4px 24px rgba(28,28,26,0.08)",
    textAlign: "center",
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ fontWeight: 800, fontSize: "24px", color: "var(--ink)", marginBottom: "4px" }}>
          rulekit<span style={{ color: "var(--orange-light)" }}>.</span>
        </div>

        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "var(--surface-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "24px auto 0",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <circle cx="11" cy="8" r="3.5" stroke="var(--ink-subtle)" strokeWidth="1.5" />
            <path d="M4 19c0-3.866 3.134-7 7-7h2c3.866 0 7 3.134 7 7" stroke="var(--ink-subtle)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>

        <div style={{ fontWeight: 700, fontSize: "18px", color: "var(--ink)", marginTop: "16px", marginBottom: "6px" }}>
          No access yet
        </div>
        <div style={{ fontSize: "14px", color: "var(--ink-muted)", lineHeight: 1.6, marginBottom: "8px" }}>
          You&apos;re signed in as <strong>{userEmail}</strong>, but you haven&apos;t been assigned to any workspace yet.
        </div>
        <div style={{ fontSize: "13px", color: "var(--ink-subtle)", lineHeight: 1.5, marginBottom: "28px" }}>
          Ask an admin to assign you a role in the Users settings.
        </div>

        <button
          onClick={onLogout}
          style={{
            fontFamily: "inherit",
            fontWeight: 600,
            fontSize: "13px",
            padding: "8px 20px",
            borderRadius: "8px",
            border: "1px solid var(--border-med)",
            background: "transparent",
            color: "var(--ink-muted)",
            cursor: "pointer",
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

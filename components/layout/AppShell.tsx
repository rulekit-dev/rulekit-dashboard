"use client";

import { ReactNode, useEffect, useState, useCallback } from "react";
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

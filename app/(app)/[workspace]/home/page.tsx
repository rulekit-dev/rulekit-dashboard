"use client";

import { useEffect, useState, useCallback, type CSSProperties } from "react";
import { useParams } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import WelcomeCard from "@/components/home/WelcomeCard";
import StatCard from "@/components/home/StatCard";
import ActivityFeed from "@/components/home/ActivityFeed";
import RulesetHealth from "@/components/home/RulesetHealth";
import CliQuickstart from "@/components/home/CliQuickstart";
import RegistryStatus from "@/components/home/RegistryStatus";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";
import * as api from "@/lib/api";
import type { Ruleset, Version } from "@/lib/types";

function SectionCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        background: "var(--surface)",
        borderRadius: "14px",
        border: "1px solid var(--border)",
        padding: "20px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: "11px",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        color: "var(--ink-subtle)",
        marginBottom: "14px",
      }}
    >
      {children}
    </div>
  );
}

export default function WorkspaceHomePage() {
  const params = useParams();
  const workspace = params.workspace as string;
  const { user, hasRole, isAdmin } = useAuth();
  const { toast } = useToast();

  const canEdit = hasRole(workspace, 3);

  const [rulesets, setRulesets] = useState<Ruleset[]>([]);
  const [versions, setVersions] = useState<Map<string, Version[]>>(new Map());
  const [draftsSet, setDraftsSet] = useState<Set<string>>(new Set());
  const [workspaceCount, setWorkspaceCount] = useState(0);
  const [apiKeyCount, setApiKeyCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [versionsLoading, setVersionsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [rsRes, wsRes] = await Promise.all([
        api.listRulesets(workspace),
        api.listWorkspaces(),
      ]);

      const rsList: Ruleset[] = Array.isArray(rsRes) ? rsRes : rsRes.data || [];
      const wsList = Array.isArray(wsRes) ? wsRes : wsRes.data || [];
      setRulesets(rsList);
      setWorkspaceCount(wsList.length);
      setLoading(false);

      const versionMap = new Map<string, Version[]>();
      const drafts = new Set<string>();

      await Promise.all(
        rsList.map(async (rs) => {
          try {
            const [vRes, dRes] = await Promise.allSettled([
              api.listVersions(workspace, rs.key),
              api.getDraft(workspace, rs.key),
            ]);

            if (vRes.status === "fulfilled") {
              const vList = Array.isArray(vRes.value) ? vRes.value : vRes.value.data || [];
              if (vList.length > 0) versionMap.set(rs.key, vList);
            }

            if (dRes.status === "fulfilled" && dRes.value) {
              const vList = versionMap.get(rs.key);
              if (!vList || vList.length === 0) {
                drafts.add(rs.key);
              } else {
                const latestV = vList.reduce((a, b) =>
                  b.version > a.version ? b : a
                );
                if (JSON.stringify(dRes.value.dsl) !== JSON.stringify(latestV.dsl)) {
                  drafts.add(rs.key);
                }
              }
            }
          } catch {
            // ignore per-ruleset errors
          }
        })
      );

      setVersions(versionMap);
      setDraftsSet(drafts);
      setVersionsLoading(false);
    } catch {
      toast("Error", "Failed to load workspace data", "error");
      setLoading(false);
      setVersionsLoading(false);
    }
  }, [workspace, toast]);

  useEffect(() => {
    if (!isAdmin) {
      setApiKeyCount(null);
      return;
    }
    api
      .listApiKeys()
      .then((res) => {
        const keys = Array.isArray(res) ? res : res.data || [];
        const active = keys.filter(
          (k) => !k.revoked_at && (!k.expires_at || new Date(k.expires_at) > new Date())
        );
        setApiKeyCount(active.length);
      })
      .catch(() => setApiKeyCount(null));
  }, [isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRulesetCreated = (rs: Ruleset) => {
    setRulesets((prev) => [...prev, rs]);
  };

  const totalPublished = Array.from(versions.values()).reduce((sum, vList) => {
    const max = vList.length > 0 ? Math.max(...vList.map((v) => v.version)) : 0;
    return sum + max;
  }, 0);

  const allVersions = Array.from(versions.entries()).flatMap(([, vList]) =>
    vList.map((v) => ({ version: v, workspace }))
  );

  return (
    <div>
      <PageHeader eyebrow={workspace} title="Home" />

      <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* ─── Welcome ─── */}
        <div className="animate-fade-up">
          <WelcomeCard
            workspace={workspace}
            workspaceCount={workspaceCount}
            email={user?.email || ""}
            rulesets={rulesets}
            versions={versions}
            draftsCount={draftsSet.size}
            loading={loading}
            onRulesetCreated={handleRulesetCreated}
          />
        </div>

        {/* ─── Overview section: stats + activity + health ─── */}
        <div className="animate-fade-up" style={{ animationDelay: "250ms" }}>
          <SectionCard>
            <SectionLabel>Overview</SectionLabel>

            {/* Stats row */}
            <div className="home-stats-grid" style={{ marginBottom: "20px" }}>
              <StatCard
                label="Rulesets"
                value={loading ? null : rulesets.length}
                sublabel={`in ${workspace} workspace`}
                dotColor="var(--blue)"
              />
              <StatCard
                label="Published versions"
                value={versionsLoading ? null : totalPublished}
                sublabel="total across all rulesets"
                dotColor="var(--green)"
              />
              <StatCard
                label="Pending drafts"
                value={versionsLoading ? null : draftsSet.size}
                sublabel={draftsSet.size === 0 ? "all up to date" : "awaiting publish"}
                dotColor="var(--orange)"
                sublabelColor={draftsSet.size === 0 ? "var(--green)" : undefined}
                valueColor={draftsSet.size === 0 ? "var(--ink-subtle)" : undefined}
              />
              <StatCard
                label="API keys"
                value={isAdmin ? apiKeyCount : "\u2014"}
                sublabel={isAdmin ? "active keys" : "admin only"}
                dotColor="var(--purple)"
              />
            </div>

            {/* Activity + Health side by side */}
            <div className="home-two-col-grid" style={{ minHeight: "300px" }}>
              <ActivityFeed versions={allVersions} loading={versionsLoading} />
              <RulesetHealth
                workspace={workspace}
                rulesets={rulesets}
                versions={versions}
                draftsSet={draftsSet}
                loading={loading || versionsLoading}
              />
            </div>
          </SectionCard>
        </div>

        {/* ─── Tools section: CLI + Registry ─── */}
        <div className="animate-fade-up" style={{ animationDelay: "500ms" }}>
          <SectionCard>
            <SectionLabel>Tools &amp; Infrastructure</SectionLabel>
            <div className="home-two-col-grid">
              <CliQuickstart workspace={workspace} versions={versions} />
              <RegistryStatus />
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

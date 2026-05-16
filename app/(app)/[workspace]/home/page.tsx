"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
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

function Metric({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <span style={{ fontSize: 14, fontWeight: 700, color, letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: 10, color: "var(--ink-subtle)" }}>{label}</span>
    </div>
  );
}

function HealthBar({ published, draft, total }: { published: number; draft: number; total: number }) {
  const never = total - published - draft;
  const pct = (n: number) => total > 0 ? `${(n / total) * 100}%` : "0%";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", height: 5, borderRadius: 3, overflow: "hidden", gap: 1 }}>
        {published > 0 && <div style={{ width: pct(published), background: "var(--green)", borderRadius: 3 }} />}
        {draft > 0 && <div style={{ width: pct(draft), background: "var(--amber)", borderRadius: 3 }} />}
        {never > 0 && <div style={{ width: pct(never), background: "var(--border-med)", borderRadius: 3 }} />}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        {[
          { label: "Published", n: published, color: "var(--green)" },
          { label: "Draft", n: draft, color: "var(--amber)" },
          { label: "Never", n: never, color: "var(--ink-subtle)" },
        ].filter(s => s.n > 0).map(s => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: s.color }} />
            <span style={{ fontSize: 10, color: "var(--ink-subtle)" }}>{s.n} {s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function WorkspaceHomePage() {
  const params = useParams();
const workspace = params.workspace as string;
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

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
                // No published version at all — draft is pending
                drafts.add(rs.key);
              } else {
                const latestV = vList.reduce((a, b) => b.version > a.version ? b : a);
                // Draft modified after the latest publish = unpublished changes
                if (new Date(dRes.value.updated_at) > new Date(latestV.created_at)) {
                  drafts.add(rs.key);
                }
              }
            }
          } catch { /* ignore per-ruleset errors */ }
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
    if (!isAdmin) { setApiKeyCount(null); return; }
    api.listApiKeys().then((res) => {
      const keys = Array.isArray(res) ? res : res.data || [];
      const active = keys.filter((k) => !k.revoked_at && (!k.expires_at || new Date(k.expires_at) > new Date()));
      setApiKeyCount(active.length);
    }).catch(() => setApiKeyCount(null));
  }, [isAdmin]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRulesetCreated = (rs: Ruleset) => setRulesets((prev) => [...prev, rs]);

  const totalPublished = Array.from(versions.values()).reduce((sum, vList) => {
    const max = vList.length > 0 ? Math.max(...vList.map((v) => v.version)) : 0;
    return sum + max;
  }, 0);

  const allVersions = Array.from(versions.entries()).flatMap(([, vList]) =>
    vList.map((v) => ({ version: v, workspace }))
  );

  // Derived stats
  const publishedRulesets = rulesets.filter(rs => {
    const vList = versions.get(rs.key);
    return vList && vList.length > 0 && !draftsSet.has(rs.key);
  }).length;
  const healthPct = rulesets.length > 0
    ? Math.round((publishedRulesets / rulesets.length) * 100)
    : null;

  // Most recently published ruleset
  let recentRuleset: string | null = null;
  let recentTime = 0;
  versions.forEach((vList, key) => {
    for (const v of vList) {
      const t = new Date(v.created_at).getTime();
      if (t > recentTime) { recentTime = t; recentRuleset = key; }
    }
  });

  return (
    <div style={{ minHeight: "100vh", background: "var(--surface)" }}>

      {/* ── Top bar ── */}
      <div style={{
        background: "var(--white)",
        borderBottom: "1px solid var(--border)",
        padding: "0 28px",
        height: 52,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-subtle)" }}>{workspace}</span>
          <span style={{ color: "var(--border-med)", fontSize: 12 }}>/</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.01em" }}>Home</span>
        </div>
      </div>

      <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* ── Welcome banner ── */}
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

        {/* ── Stat strip ── */}
        <div className="animate-fade-up home-stats-grid" style={{ animationDelay: "60ms" }}>
          {/* Rulesets */}
          <StatCard
            label="Rulesets"
            value={loading ? null : rulesets.length}
            sublabel={`in the ${workspace} workspace`}
            accentColor="#2563EB"
            icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="5" rx="1.5" fill="currentColor" opacity="0.7"/><rect x="8" y="1" width="5" height="5" rx="1.5" fill="currentColor"/><rect x="1" y="8" width="5" height="5" rx="1.5" fill="currentColor" opacity="0.4"/><rect x="8" y="8" width="5" height="5" rx="1.5" fill="currentColor" opacity="0.7"/></svg>}
            tag={!loading && rulesets.length > 0 ? { text: `${publishedRulesets} live`, color: "#1A7F4B", bg: "rgba(26,127,75,0.08)" } : undefined}
            detail={!loading && rulesets.length > 0 ? (
              <div style={{ display: "flex", gap: 12 }}>
                <Metric label="Published" value={publishedRulesets} color="var(--green)" />
                <Metric label="Drafts" value={draftsSet.size} color={draftsSet.size > 0 ? "var(--amber)" : "var(--ink-subtle)"} />
                <Metric label="Unpublished" value={rulesets.length - publishedRulesets - draftsSet.size} color="var(--ink-subtle)" />
              </div>
            ) : undefined}
          />

          {/* Versions */}
          <StatCard
            label="Total versions"
            value={versionsLoading ? null : totalPublished}
            sublabel="published across all rulesets"
            accentColor="#7C3AED"
            icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5"/><path d="M7 4v3.5l2 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>}
            tag={!versionsLoading && recentRuleset ? { text: "recently active", color: "#7C3AED", bg: "rgba(124,58,237,0.08)" } : undefined}
            detail={!versionsLoading && recentRuleset ? (
              <div style={{ fontSize: 11, color: "var(--ink-muted)" }}>
                Latest: <span style={{ fontWeight: 600, color: "var(--ink)" }}>{recentRuleset}</span>
              </div>
            ) : undefined}
          />

          {/* Health */}
          <StatCard
            label="Workspace health"
            value={versionsLoading ? null : (healthPct !== null ? `${healthPct}%` : "—")}
            sublabel="of rulesets fully published"
            accentColor={healthPct === 100 ? "#1A7F4B" : healthPct !== null && healthPct >= 50 ? "#B45309" : "#DC2626"}
            icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.5L8.5 5H12l-2.8 2.2 1 3.3L7 8.5l-3.2 2L4.8 7.2 2 5h3.5L7 1.5z" fill="currentColor"/></svg>}
            tag={!versionsLoading && healthPct !== null ? {
              text: healthPct === 100 ? "all good" : draftsSet.size > 0 ? `${draftsSet.size} pending` : "needs attention",
              color: healthPct === 100 ? "#1A7F4B" : "var(--amber)",
              bg: healthPct === 100 ? "rgba(26,127,75,0.08)" : "rgba(180,83,9,0.08)",
            } : undefined}
            detail={!versionsLoading && rulesets.length > 0 ? (
              <HealthBar published={publishedRulesets} draft={draftsSet.size} total={rulesets.length} />
            ) : undefined}
          />

          {/* API keys */}
          <StatCard
            label="API keys"
            value={loading ? null : (isAdmin ? apiKeyCount : "—")}
            sublabel={isAdmin ? "active keys in this account" : "admin access required"}
            accentColor="#64748B"
            icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="5.5" cy="5.5" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M7.5 7.5l4 4M9.5 9.5l1.5-1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>}
            tag={isAdmin && apiKeyCount !== null && apiKeyCount > 0 ? { text: "active", color: "#1A7F4B", bg: "rgba(26,127,75,0.08)" } : undefined}
            detail={isAdmin ? (
              <div style={{ fontSize: 11, color: "var(--ink-muted)" }}>
                {apiKeyCount === null ? "Loading…" : apiKeyCount === 0 ? "No active keys — create one to use the API" : `${apiKeyCount} key${apiKeyCount !== 1 ? "s" : ""} with API access`}
              </div>
            ) : undefined}
          />
        </div>

        {/* ── Main two-col ── */}
        <div className="animate-fade-up home-two-col-grid" style={{ animationDelay: "120ms" }}>
          <ActivityFeed versions={allVersions} loading={versionsLoading} />
          <RulesetHealth workspace={workspace} rulesets={rulesets} versions={versions} draftsSet={draftsSet} loading={loading || versionsLoading} />
        </div>

        {/* ── Bottom two-col ── */}
        <div className="animate-fade-up home-two-col-grid" style={{ animationDelay: "180ms" }}>
          <CliQuickstart workspace={workspace} versions={versions} />
          <RegistryStatus />
        </div>

      </div>
    </div>
  );
}

import { ApiError, dslToApi } from "./types";
import type { DSL } from "./types";

class ApiErrorImpl extends Error implements ApiError {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "ApiError";
  }
}

let _registryUrl = "";

export function setRegistryUrl(url: string) {
  _registryUrl = url.replace(/\/+$/, "");
}

function getBaseUrl(): string {
  return _registryUrl || process.env.NEXT_PUBLIC_REGISTRY_URL || "http://localhost:8080";
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refresh_token");
}

async function refreshAccessToken(): Promise<boolean> {
  const rt = getRefreshToken();
  if (!rt) return false;

  try {
    const res = await fetch(`${getBaseUrl()}/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: rt }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    localStorage.setItem("access_token", data.access_token);
    if (data.refresh_token) {
      localStorage.setItem("refresh_token", data.refresh_token);
    }
    return true;
  } catch {
    return false;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const url = `${getBaseUrl()}${path}`;
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401 && retry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request<T>(path, options, false);
    }
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    window.location.href = "/login";
    throw new ApiErrorImpl("UNAUTHORIZED", "Session expired");
  }

  if (!res.ok) {
    let body: { code?: string; message?: string } = {};
    try {
      body = await res.json();
    } catch {
      // ignore
    }
    throw new ApiErrorImpl(
      body.code || `HTTP_${res.status}`,
      body.message || res.statusText
    );
  }

  if (res.status === 204) return undefined as T;

  return res.json();
}

async function requestBlob(path: string): Promise<Blob> {
  const url = `${getBaseUrl()}${path}`;
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    let body: { code?: string; message?: string } = {};
    try { body = await res.json(); } catch { /* ignore */ }
    throw new ApiErrorImpl(body.code || `HTTP_${res.status}`, body.message || res.statusText);
  }
  return res.blob();
}

// Auth
export function login(email: string, password?: string) {
  const body: Record<string, string> = { email };
  if (password) body.password = password;
  return request<{
    access_token?: string;
    refresh_token?: string;
    token_type?: string;
    expires_in?: number;
    message?: string;
  }>("/v1/auth/login", { method: "POST", body: JSON.stringify(body) }, false);
}

export function verifyOtp(email: string, code: string) {
  return request<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>("/v1/auth/verify", {
    method: "POST",
    body: JSON.stringify({ email, code }),
  }, false);
}

export function logout(refreshToken: string) {
  return request<void>("/v1/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
}

// Workspaces
export function listWorkspaces(limit = 50, offset = 0) {
  return request<{ data: import("./types").Workspace[] }>(
    `/v1/workspaces?limit=${limit}&offset=${offset}`
  );
}

export function getWorkspace(name: string) {
  return request<import("./types").Workspace>(
    `/v1/workspaces/${encodeURIComponent(name)}`
  );
}

export function createWorkspace(name: string, description: string) {
  return request<import("./types").Workspace>("/v1/workspaces", {
    method: "POST",
    body: JSON.stringify({ name, description }),
  });
}

export function deleteWorkspace(name: string) {
  return request<void>(`/v1/workspaces/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
}

// Rulesets
export function listRulesets(workspace: string, limit = 50, offset = 0) {
  return request<{ data: import("./types").Ruleset[] }>(
    `/v1/rulesets?workspace=${encodeURIComponent(workspace)}&limit=${limit}&offset=${offset}`
  );
}

export function getRuleset(workspace: string, key: string) {
  return request<import("./types").Ruleset>(
    `/v1/rulesets/${encodeURIComponent(key)}?workspace=${encodeURIComponent(workspace)}`
  );
}

export function createRuleset(workspace: string, key: string, name: string, description: string) {
  return request<import("./types").Ruleset>("/v1/rulesets", {
    method: "POST",
    body: JSON.stringify({ workspace, key, name, description }),
  });
}

export function deleteRuleset(workspace: string, key: string) {
  return request<void>(
    `/v1/rulesets/${encodeURIComponent(key)}?workspace=${encodeURIComponent(workspace)}`,
    { method: "DELETE" }
  );
}

// Draft
export function getDraft(workspace: string, key: string) {
  return request<import("./types").Draft>(
    `/v1/rulesets/${encodeURIComponent(key)}/draft?workspace=${encodeURIComponent(workspace)}`
  );
}

export function saveDraft(workspace: string, key: string, dsl: DSL) {
  const apiDsl = dslToApi(dsl);
  return request<import("./types").Draft>(
    `/v1/rulesets/${encodeURIComponent(key)}/draft?workspace=${encodeURIComponent(workspace)}`,
    { method: "PUT", body: JSON.stringify({ dsl: apiDsl }) }
  );
}

export function deleteDraft(workspace: string, key: string) {
  return request<void>(
    `/v1/rulesets/${encodeURIComponent(key)}/draft?workspace=${encodeURIComponent(workspace)}`,
    { method: "DELETE" }
  );
}

// Versions
export function listVersions(workspace: string, key: string, limit = 50, offset = 0) {
  return request<{ data: import("./types").Version[] }>(
    `/v1/rulesets/${encodeURIComponent(key)}/versions?workspace=${encodeURIComponent(workspace)}&limit=${limit}&offset=${offset}`
  );
}

export function getVersion(workspace: string, key: string, version: number | "latest") {
  return request<import("./types").Version>(
    `/v1/rulesets/${encodeURIComponent(key)}/versions/${version}?workspace=${encodeURIComponent(workspace)}`
  );
}

export function publishRuleset(workspace: string, key: string) {
  return request<import("./types").Version>(
    `/v1/rulesets/${encodeURIComponent(key)}/publish?workspace=${encodeURIComponent(workspace)}`,
    { method: "POST" }
  );
}

export function downloadBundle(workspace: string, key: string, version: number | "latest") {
  return requestBlob(
    `/v1/rulesets/${encodeURIComponent(key)}/versions/${version}/bundle?workspace=${encodeURIComponent(workspace)}`
  );
}

// Admin: Users
export function listUsers(limit = 50, offset = 0) {
  return request<{ data: import("./types").User[] }>(
    `/v1/admin/users?limit=${limit}&offset=${offset}`
  );
}

export function deleteUser(id: string) {
  return request<void>(`/v1/admin/users/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function getUserRoles(id: string) {
  return request<{ data: import("./types").UserRole[] }>(
    `/v1/admin/users/${encodeURIComponent(id)}/roles`
  );
}

export function setUserRole(id: string, workspace: string, roleMask: number) {
  return request<void>(
    `/v1/admin/users/${encodeURIComponent(id)}/roles/${encodeURIComponent(workspace)}`,
    { method: "PUT", body: JSON.stringify({ role_mask: roleMask }) }
  );
}

export function deleteUserRole(id: string, workspace: string) {
  return request<void>(
    `/v1/admin/users/${encodeURIComponent(id)}/roles/${encodeURIComponent(workspace)}`,
    { method: "DELETE" }
  );
}

// Admin: API Keys
export function listApiKeys(limit = 50, offset = 0) {
  return request<{ data: import("./types").APIKey[] }>(
    `/v1/admin/keys?limit=${limit}&offset=${offset}`
  );
}

export function createApiKey(name: string, workspace: string, role: number, expiresInDays?: number) {
  return request<{ key: string } & import("./types").APIKey>("/v1/admin/keys", {
    method: "POST",
    body: JSON.stringify({
      name,
      workspace,
      role,
      ...(expiresInDays ? { expires_in_days: expiresInDays } : {}),
    }),
  });
}

export function revokeApiKey(id: string) {
  return request<void>(`/v1/admin/keys/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// Evaluate
export function evaluateRuleset(workspace: string, key: string, input: Record<string, unknown>) {
  return request<{ result: Record<string, unknown>; trace: { rule_id: string; rule_name: string; matched: boolean; duration_us: number }[] }>(
    `/v1/rulesets/${encodeURIComponent(key)}/evaluate?workspace=${encodeURIComponent(workspace)}`,
    { method: "POST", body: JSON.stringify(input) }
  );
}

// Health
export interface HealthResponse {
  status: string;
  version: string;
  store: string;
  uptime_seconds: number;
}

export async function getHealth(): Promise<{ data: HealthResponse; responseTimeMs: number }> {
  const start = performance.now();
  const url = `${getBaseUrl()}/healthz`;
  const res = await fetch(url);
  const responseTimeMs = Math.round(performance.now() - start);
  if (!res.ok) throw new Error("Health check failed");
  const data: HealthResponse = await res.json();
  return { data, responseTimeMs };
}

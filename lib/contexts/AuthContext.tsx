"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { useConfig } from "./ConfigContext";
import { setRegistryUrl } from "../api";
import * as api from "../api";

interface JwtPayload {
  sub: string;
  email: string;
  roles: { workspace: string; role: number }[];
}

interface AuthUser {
  id: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAdmin: boolean;
  loading: boolean;
  hasRole: (workspace: string, minRole: number) => boolean;
  logout: () => Promise<void>;
  onLogin: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAdmin: false,
  loading: true,
  hasRole: () => false,
  logout: async () => {},
  onLogin: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload as JwtPayload;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { registryUrl, loading: configLoading } = useConfig();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [roles, setRoles] = useState<{ workspace: string; role: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setUser(null);
      setRoles([]);
      setLoading(false);
      return;
    }

    const payload = decodeJwt(token);
    if (!payload) {
      setUser(null);
      setRoles([]);
      setLoading(false);
      return;
    }

    setUser({ id: payload.sub, email: payload.email });
    setRoles(payload.roles || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (configLoading) return;
    setRegistryUrl(registryUrl);
    loadUser();
  }, [configLoading, registryUrl, loadUser]);

  const isAdmin = roles.some((r) => (r.role & 7) === 7);

  const hasRole = useCallback(
    (workspace: string, minRole: number) => {
      return roles.some(
        (r) =>
          (r.workspace === "*" || r.workspace === workspace) &&
          (r.role & minRole) !== 0
      );
    },
    [roles]
  );

  const doLogout = useCallback(async () => {
    const rt = localStorage.getItem("refresh_token");
    try {
      if (rt) await api.logout(rt);
    } catch {
      // ignore
    }
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
    setRoles([]);
    window.location.href = "/login";
  }, []);

  const onLogin = useCallback(() => {
    loadUser();
  }, [loadUser]);

  return (
    <AuthContext.Provider
      value={{ user, isAdmin, loading: loading || configLoading, hasRole, logout: doLogout, onLogin }}
    >
      {children}
    </AuthContext.Provider>
  );
}

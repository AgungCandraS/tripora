"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, getToken, setToken } from "../lib/api";
import type { ApiUser } from "../lib/types";

interface AuthState {
  user: ApiUser | null;
  token: string | null;
  roles: string[];
  loading: boolean;
  login: (email: string, password: string) => Promise<ApiUser>;
  register: (input: { full_name: string; email: string; phone: string; password: string }) => Promise<ApiUser>;
  logout: () => void;
  hasRole: (...roles: string[]) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60 * 1000, retry: 1, refetchOnWindowFocus: false },
    },
  });
}

let browserClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === "undefined") return makeQueryClient();
  if (!browserClient) browserClient = makeQueryClient();
  return browserClient;
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = getToken();
    if (!t) {
      setLoading(false);
      return;
    }
    setTokenState(t);
    api
      .get<ApiUser>("/auth/me", t)
      .then((u) => setUser(u))
      .catch(() => {
        setToken(null);
        setTokenState(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ user: ApiUser; tokens: { accessToken: string } }>("/auth/login", { email, password }, null);
    setToken(res.tokens.accessToken);
    setTokenState(res.tokens.accessToken);
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(async (input: { full_name: string; email: string; phone: string; password: string }) => {
    // Register TIDAK auto-login: akun wajib verifikasi email dulu (PRD §7.1).
    const res = await api.post<{ user: ApiUser }>("/auth/register", input, null);
    return res.user;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setTokenState(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(() => {
    const raw = (user?.roles ?? []) as Array<string | { role?: { code?: string }; code?: string }>;
    const roles = raw
      .map((r) => (typeof r === "string" ? r : (r?.role?.code ?? r?.code ?? "")))
      .filter((c): c is string => c.length > 0);
    return {
      user,
      token,
      roles,
      loading,
      login,
      register,
      logout,
      hasRole: (...rs: string[]) => rs.some((r) => roles.includes(r)),
    };
  }, [user, token, loading, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within Providers");
  return ctx;
}

export default function Providers({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

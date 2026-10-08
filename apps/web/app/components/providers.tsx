"use client";

import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { api } from "../lib/api";
import type { ApiUser } from "../lib/types";

interface AuthState {
  user: ApiUser | null;
  /**
   * @deprecated Auth via httpOnly cookie; selalu null. Dipertahankan agar
   * 60+ call-site `api.*(…, token)` tak perlu diubah (param diabaikan).
   */
  token: null;
  authenticated: boolean;
  roles: string[];
  loading: boolean;
  login: (email: string, password: string) => Promise<ApiUser>;
  register: (input: {
    full_name: string;
    email: string;
    phone: string;
    password: string;
  }) => Promise<ApiUser>;
  logout: () => void;
  refreshUser: () => Promise<void>;
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
  const queryClient = useQueryClient();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const authRevision = useRef(0);
  const hadSession = useRef(false);
  const pendingLogout = useRef<Promise<unknown> | null>(null);

  const refreshUser = useCallback(async () => {
    const revision = authRevision.current;
    try {
      const u = await api.get<ApiUser>("/auth/me");
      if (revision === authRevision.current) {
        hadSession.current = true;
        setUser(u);
      }
    } catch {
      if (revision !== authRevision.current) return;
      if (hadSession.current) queryClient.clear();
      hadSession.current = false;
      setUser(null);
    }
  }, [queryClient]);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      await pendingLogout.current;
      const res = await api.post<{ user: ApiUser }>("/auth/login", {
        email,
        password,
      });
      await queryClient.cancelQueries();
      queryClient.clear();
      authRevision.current += 1;
      hadSession.current = true;
      setLoading(false);
      setUser(res.user);
      return res.user;
    },
    [queryClient],
  );

  const register = useCallback(
    async (input: {
      full_name: string;
      email: string;
      phone: string;
      password: string;
    }) => {
      // Register TIDAK auto-login: akun wajib verifikasi email dulu (PRD §7.1).
      const res = await api.post<{ user: ApiUser }>("/auth/register", input);
      return res.user;
    },
    [],
  );

  const logout = useCallback(() => {
    // Clear the local session immediately; the next login waits for cookie removal.
    authRevision.current += 1;
    hadSession.current = false;
    if (!pendingLogout.current)
      pendingLogout.current = api
        .post("/auth/logout", {})
        .catch(() => undefined)
        .finally(() => {
          pendingLogout.current = null;
        });
    void queryClient.cancelQueries();
    queryClient.clear();
    setUser(null);
  }, [queryClient]);

  const value = useMemo<AuthState>(() => {
    const raw = (user?.roles ?? []) as Array<
      string | { role?: { code?: string }; code?: string }
    >;
    const roles = raw
      .map((r) =>
        typeof r === "string" ? r : (r?.role?.code ?? r?.code ?? ""),
      )
      .filter((c): c is string => c.length > 0);
    return {
      user,
      token: null,
      authenticated: Boolean(user) && !loading,
      roles,
      loading,
      login,
      register,
      logout,
      refreshUser,
      hasRole: (...rs: string[]) => rs.some((r) => roles.includes(r)),
    };
  }, [user, loading, login, register, logout, refreshUser]);

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

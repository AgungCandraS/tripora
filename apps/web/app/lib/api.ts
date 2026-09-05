export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("tripora_token");
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem("tripora_token", token);
  else window.localStorage.removeItem("tripora_token");
}

/** Stable guest session id binding reservation holds to this browser (PRD §37). */
export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = window.localStorage.getItem("tripora_session");
  if (!sid) {
    sid = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem("tripora_session", sid);
  }
  return sid;
}

async function request<T>(path: string, init?: RequestInit, token?: string | null): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as {
    success?: boolean;
    data?: T;
    error?: { code?: string; message?: string | string[] };
  } | null;
  if (!res.ok || !json || json.success === false) {
    const err = json?.error;
    const message = Array.isArray(err?.message) ? err.message.join("; ") : (err?.message ?? `Request failed (${res.status})`);
    throw new ApiError(err?.code ?? "REQUEST_FAILED", message, res.status);
  }
  return (json.data ?? null) as T;
}

export const api = {
  get: <T>(path: string, token?: string | null) => request<T>(path, { method: "GET" }, token ?? getToken()),
  post: <T>(path: string, body?: unknown, token?: string | null) =>
    request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }, token ?? getToken()),
  patch: <T>(path: string, body?: unknown, token?: string | null) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }, token ?? getToken()),
  put: <T>(path: string, body?: unknown, token?: string | null) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }, token ?? getToken()),
  del: <T>(path: string, token?: string | null) => request<T>(path, { method: "DELETE" }, token ?? getToken()),
};

export function formatIDR(n: number) {
  return `Rp${new Intl.NumberFormat("id-ID").format(n)}`;
}

/** Server-side fetch helper (Server Components): no token, public endpoints only. */
export async function apiPublic<T>(path: string, revalidateSeconds = 60): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1${path}`, { next: { revalidate: revalidateSeconds } });
    if (!res.ok) return null;
    const json = (await res.json()) as { success?: boolean; data?: T };
    if (!json || json.success === false) return null;
    return (json.data ?? null) as T;
  } catch {
    return null;
  }
}

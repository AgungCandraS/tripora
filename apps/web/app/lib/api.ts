export const API_URL =
  typeof window === "undefined"
    ? (process.env.API_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      "http://localhost:4000")
    : (process.env.NEXT_PUBLIC_API_URL ?? "");

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function raw<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    // Sesi httpOnly cookie (OWASP A07): browser mengirim otomatis, JS tak bisa baca.
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...((init?.headers ?? {}) as Record<string, string>),
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
    const message = Array.isArray(err?.message)
      ? err.message.join("; ")
      : (err?.message ?? `Request failed (${res.status})`);
    throw new ApiError(err?.code ?? "REQUEST_FAILED", message, res.status);
  }
  return (json.data ?? null) as T;
}

// Single-flight silent refresh: 401 → perbarui sesi sekali → ulangi request.
let refreshPromise: Promise<unknown> | null = null;

async function request<T>(
  path: string,
  init?: RequestInit,
  _token?: string | null,
): Promise<T> {
  void _token; // legacy param, diabaikan: auth via cookie
  try {
    return await raw<T>(path, init);
  } catch (e) {
    const isAuthPath =
      path.startsWith("/auth/login") ||
      path.startsWith("/auth/refresh") ||
      path.startsWith("/auth/logout");
    if (
      !(e instanceof ApiError) ||
      e.status !== 401 ||
      isAuthPath ||
      typeof window === "undefined"
    )
      throw e;
    if (!refreshPromise) {
      refreshPromise = raw("/auth/refresh", {
        method: "POST",
        body: "{}",
      }).finally(() => {
        refreshPromise = null;
      });
    }
    try {
      await refreshPromise;
    } catch {
      throw e; // refresh gagal → sesi benar-benar habis
    }
    return raw<T>(path, init);
  }
}

export const api = {
  get: <T>(path: string, token?: string | null) =>
    request<T>(path, { method: "GET" }, token),
  post: <T>(path: string, body?: unknown, token?: string | null) =>
    request<T>(
      path,
      {
        method: "POST",
        body: body === undefined ? undefined : JSON.stringify(body),
      },
      token,
    ),
  patch: <T>(path: string, body?: unknown, token?: string | null) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }, token),
  put: <T>(path: string, body?: unknown, token?: string | null) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }, token),
  del: <T>(path: string, token?: string | null) =>
    request<T>(path, { method: "DELETE" }, token),
};

export function formatIDR(n: number) {
  return `Rp${new Intl.NumberFormat("id-ID").format(n)}`;
}

/** Stable guest session id binding reservation holds to this browser (PRD §37). */
export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = window.localStorage.getItem("tripora_session");
  if (!sid) {
    sid =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem("tripora_session", sid);
  }
  return sid;
}

/** Server-side fetch helper (Server Components): no token, public endpoints only. */
export async function apiPublic<T>(
  path: string,
  revalidateSeconds = 60,
): Promise<T | null> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    next: { revalidate: revalidateSeconds },
    signal: AbortSignal.timeout(8000),
  }).catch(() => {
    throw new Error("Informasi belum bisa dimuat. Silakan coba lagi.");
  });
  if (res.status === 404) return null;
  if (!res.ok)
    throw new Error("Informasi belum bisa dimuat. Silakan coba lagi.");
  const json = (await res.json()) as { success?: boolean; data?: T };
  if (!json || json.success === false)
    throw new Error("Informasi belum bisa dimuat. Silakan coba lagi.");
  return (json.data ?? null) as T;
}

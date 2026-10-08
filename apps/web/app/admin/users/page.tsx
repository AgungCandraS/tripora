"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pause, UserPlus } from "@phosphor-icons/react";
import {
  StatusPill,
  WorkspaceHeader,
  WorkspaceShell,
} from "../../components/workspace-shell";
import { useAuth } from "../../components/providers";
import { ApiError, api } from "../../lib/api";

type Filter = "Semua" | "CUSTOMER" | "VENDOR_OWNER" | "VENDOR_STAFF" | "ADMIN";

interface UserRow {
  id: string;
  full_name: string;
  email: string | null;
  status: string;
  created_at: string;
  roles: Array<{ role: { code: string } }>;
}

const EDITABLE = ["CUSTOMER", "VENDOR_OWNER", "VENDOR_STAFF", "ADMIN"];

export default function AdminUsersPage() {
  const { authenticated, token, user: me } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("Semua");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const query = useQuery({
    queryKey: ["admin-users", filter],
    queryFn: () =>
      api.get<{ users: UserRow[] }>(
        `/admin/users${filter === "Semua" ? "" : `?role=${filter}`}`,
        token,
      ),
    enabled: Boolean(authenticated),
  });
  const rows = query.data?.users ?? [];
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });

  async function update(
    id: string,
    patch: { status?: string; roles?: string[] },
  ) {
    setError("");
    try {
      await api.patch(`/admin/users/${id}`, patch, token);
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Gagal menyimpan.");
    }
  }

  return (
    <WorkspaceShell role="admin" current="/admin/users">
      <WorkspaceHeader
        eyebrow="Users & RBAC"
        title="Pengguna platform."
        description="Ubah role dan suspend user. Tidak bisa mengubah akun sendiri. Semua tercatat di audit."
      />
      <form
        className="mt-8 flex max-w-[520px] gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setError(
            "Undang user = mereka daftar sendiri di /auth/register; admin mengatur role di sini.",
          );
        }}
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Cari email untuk verifikasi cepat…"
          className="min-w-0 flex-1 rounded-[10px] border border-line bg-paper px-3.5 py-3 text-sm outline-none placeholder:text-ink/35 focus:border-coral-dark"
        />
        <button
          type="submit"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-[10px] bg-ink px-4 py-3 text-sm font-bold text-paper"
        >
          <UserPlus size={16} /> Cek
        </button>
      </form>
      {error && (
        <p className="mt-3 text-xs font-bold text-coral-dark" role="alert">
          {error}
        </p>
      )}
      <div
        className="mt-6 flex flex-wrap gap-2"
        role="tablist"
        aria-label="Filter role"
      >
        {(
          [
            "Semua",
            "CUSTOMER",
            "VENDOR_OWNER",
            "VENDOR_STAFF",
            "ADMIN",
          ] as Filter[]
        ).map((r) => (
          <button
            key={r}
            role="tab"
            aria-selected={filter === r}
            onClick={() => setFilter(r)}
            className={`rounded-full border px-3.5 py-2 text-xs font-bold transition ${filter === r ? "border-ink bg-ink text-paper" : "border-line text-ink/60 hover:border-ink/40"}`}
          >
            {r.replace("_", " ")}
          </button>
        ))}
      </div>
      <div className="mt-6 space-y-3">
        {query.isLoading ? (
          <div
            className="h-24 animate-pulse rounded-[12px] bg-paper"
            aria-busy="true"
            aria-label="Memuat user"
          />
        ) : rows.length === 0 ? (
          <p className="rounded-[12px] border border-dashed border-line bg-paper px-5 py-8 text-center text-sm text-ink/55">
            {email
              ? `Tidak ada user dengan email "${email}".`
              : "Tidak ada pengguna pada role ini."}
          </p>
        ) : (
          rows
            .filter(
              (u) =>
                !email ||
                (u.email ?? "").toLowerCase().includes(email.toLowerCase()),
            )
            .map((u) => {
              const codes = u.roles
                .map((r) => r?.role?.code)
                .filter((c): c is string => Boolean(c));
              const self = me?.id === u.id;
              return (
                <div
                  key={u.id}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-line bg-paper px-5 py-4 ${u.status === "ACTIVE" ? "" : "opacity-60"}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-soft text-sm font-black text-moss">
                      {u.full_name.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-bold">
                        {u.full_name}{" "}
                        {self && (
                          <span className="text-[11px] text-ink/45">
                            (kamu)
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-ink/50">
                        {u.email ?? "-"} · {u.created_at.slice(0, 10)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={codes[0] ?? "CUSTOMER"}
                      disabled={self}
                      onChange={(e) =>
                        update(u.id, { roles: [e.target.value] })
                      }
                      className="rounded-[8px] border border-line bg-transparent px-2.5 py-2 text-xs font-bold outline-none focus:border-coral-dark disabled:opacity-50"
                      aria-label={`Role ${u.full_name}`}
                    >
                      {EDITABLE.map((r) => (
                        <option key={r} value={r}>
                          {r.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={self}
                      onClick={() =>
                        update(u.id, {
                          status:
                            u.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-[8px] border border-line px-3 py-2 text-xs font-bold hover:border-ink/40 disabled:opacity-50"
                    >
                      <Pause size={13} weight="bold" />{" "}
                      {u.status === "ACTIVE" ? "Suspend" : "Aktifkan"}
                    </button>
                    <StatusPill
                      status={u.status === "ACTIVE" ? "PAID" : "CANCELLED"}
                    />
                  </div>
                </div>
              );
            })
        )}
      </div>
    </WorkspaceShell>
  );
}

"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import Link from "next/link";
import {
  WorkspaceHeader,
  WorkspaceShell,
} from "../../components/workspace-shell";
import { useAuth } from "../../components/providers";
import { ApiError, api } from "../../lib/api";

interface Setting {
  key: string;
  description: string;
  value: string;
  source: "database" | "env";
}

export default function AdminSettingsPage() {
  const { authenticated, token } = useAuth();
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [savedKey, setSavedKey] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => api.get<Setting[]>("/admin/settings", token),
    enabled: Boolean(authenticated),
  });
  const rows = query.data ?? [];

  async function save(e: FormEvent<HTMLFormElement>, key: string) {
    e.preventDefault();
    const value = drafts[key];
    if (value === undefined) return;
    setError("");
    setSavedKey(null);
    try {
      await api.patch("/admin/settings", { key, value }, token);
      setSavedKey(key);
      setDrafts((d) => {
        const n = { ...d };
        delete n[key];
        return n;
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan.");
    }
  }

  return (
    <WorkspaceShell role="admin" current="/admin/settings">
      <WorkspaceHeader
        eyebrow="Platform settings"
        title="Konfigurasi Tripora."
        description="Nilai database menimpa env dan langsung dipakai backend (fee, hold, expiry, payout, gateway). Semua perubahan beraudit."
      />
      {error && (
        <p
          className="mt-4 rounded-[10px] bg-[#f6d9c8] px-4 py-3 text-sm font-semibold text-[#8a3a20]"
          role="alert"
        >
          {error}
        </p>
      )}
      {query.isLoading ? (
        <div
          className="mt-8 space-y-3"
          aria-busy="true"
          aria-label="Memuat settings"
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-[12px] bg-paper"
            />
          ))}
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {rows.map((s) => (
            <form
              key={s.key}
              onSubmit={(e) => save(e, s.key)}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-line bg-paper px-5 py-4"
            >
              <div className="min-w-52 flex-1">
                <p className="font-mono text-sm font-bold">{s.key}</p>
                <p className="mt-0.5 text-xs text-ink/50">
                  {s.description} · sumber:{" "}
                  <strong>
                    {s.source === "database" ? "database" : "env"}
                  </strong>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  defaultValue={s.value}
                  key={`${s.key}-${s.value}`}
                  onChange={(e) =>
                    setDrafts((d) => ({ ...d, [s.key]: e.target.value }))
                  }
                  aria-label={`Nilai ${s.key}`}
                  className="w-44 rounded-[8px] border border-line bg-transparent px-3 py-2 font-mono text-sm outline-none focus:border-coral-dark"
                />
                <button
                  type="submit"
                  disabled={drafts[s.key] === undefined}
                  className="rounded-[8px] bg-ink px-4 py-2 text-xs font-bold text-paper disabled:opacity-40"
                >
                  Simpan
                </button>
                {savedKey === s.key && (
                  <span className="text-xs font-bold text-moss" role="status">
                    OK
                  </span>
                )}
              </div>
            </form>
          ))}
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href="/admin/vendors"
          className="rounded-[10px] border border-line px-4 py-2.5 text-sm font-bold hover:border-ink/40"
        >
          Kelola komisi vendor
        </Link>
        <Link
          href="/admin/promos"
          className="rounded-[10px] border border-line px-4 py-2.5 text-sm font-bold hover:border-ink/40"
        >
          Kelola promo
        </Link>
      </div>
    </WorkspaceShell>
  );
}

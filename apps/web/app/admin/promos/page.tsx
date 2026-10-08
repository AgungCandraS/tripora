"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "@phosphor-icons/react";
import { FormEvent, useState } from "react";
import {
  StatusPill,
  WorkspaceHeader,
  WorkspaceShell,
} from "../../components/workspace-shell";
import { useAuth } from "../../components/providers";
import { ApiError, api, formatIDR } from "../../lib/api";

interface Promo {
  id: string;
  code: string;
  type: "PERCENT" | "NOMINAL";
  value: number;
  minimum_purchase: number | null;
  usage_limit: number | null;
  status: string;
  vendor_id: string | null;
}

export default function AdminPromosPage() {
  const { authenticated, token } = useAuth();
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [ptype, setPtype] = useState<"PERCENT" | "NOMINAL">("PERCENT");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  const query = useQuery({
    queryKey: ["admin-promos"],
    queryFn: () => api.get<Promo[]>("/admin/promotions", token),
    enabled: Boolean(authenticated),
  });
  const promos = query.data ?? [];
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-promos"] });

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!code.trim() || !Number(value)) return;
    setError("");
    try {
      await api.post(
        "/admin/promotions",
        { code: code.trim(), type: ptype, value: Number(value) },
        token,
      );
      setCode("");
      setValue("");
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal membuat promo.");
    }
  }

  async function toggle(p: Promo) {
    try {
      await api.patch(
        `/admin/promotions/${p.id}`,
        { status: p.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" },
        token,
      );
      await refresh();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Gagal mengubah status.",
      );
    }
  }

  return (
    <WorkspaceShell role="admin" current="/admin/promos">
      <WorkspaceHeader
        eyebrow="Promotions"
        title="Promo platform."
        description="Voucher platform (vendor_id null) + semua promo vendor. Nonaktifkan, jangan hapus — histori usage harus utuh."
      />
      <form
        onSubmit={create}
        className="mt-8 grid max-w-[680px] gap-2 sm:grid-cols-[1fr_0.6fr_0.6fr_auto]"
      >
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Kode, cth. LIBUR30"
          className="min-w-0 rounded-[10px] border border-line bg-paper px-3.5 py-3 font-mono text-sm font-bold tracking-wider outline-none placeholder:font-sans placeholder:font-normal placeholder:text-ink/35 focus:border-coral-dark"
        />
        <select
          value={ptype}
          onChange={(e) => setPtype(e.target.value as "PERCENT" | "NOMINAL")}
          className="rounded-[10px] border border-line bg-paper px-3 py-3 text-sm font-bold outline-none focus:border-coral-dark"
          aria-label="Tipe"
        >
          <option value="PERCENT">Persen %</option>
          <option value="NOMINAL">Nominal Rp</option>
        </select>
        <input
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={ptype === "PERCENT" ? "cth. 20" : "cth. 50000"}
          className="rounded-[10px] border border-line bg-paper px-3.5 py-3 font-mono text-sm outline-none focus:border-coral-dark"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1.5 rounded-[10px] bg-ink px-4 py-3 text-sm font-bold text-paper"
        >
          <Plus size={15} weight="bold" /> Buat
        </button>
      </form>
      {error && (
        <p className="mt-3 text-xs font-bold text-coral-dark" role="alert">
          {error}
        </p>
      )}
      <div className="mt-5 max-w-[720px] space-y-3">
        {query.isLoading ? (
          <div
            className="h-20 animate-pulse rounded-[12px] bg-paper"
            aria-busy="true"
            aria-label="Memuat promo"
          />
        ) : promos.length === 0 ? (
          <p className="rounded-[12px] border border-dashed border-line bg-paper px-5 py-10 text-center text-sm text-ink/55">
            Belum ada promo.
          </p>
        ) : (
          promos.map((p) => (
            <div
              key={p.id}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-line bg-paper px-5 py-4 ${p.status === "ACTIVE" ? "" : "opacity-65"}`}
            >
              <div>
                <div className="flex items-center gap-2.5">
                  <p className="font-mono text-sm font-bold tracking-wider">
                    {p.code}
                  </p>
                  <StatusPill
                    status={p.status === "ACTIVE" ? "PAID" : "EXPIRED"}
                  />
                </div>
                <p className="mt-0.5 text-xs text-ink/50">
                  {p.type === "PERCENT" ? `${p.value}%` : formatIDR(p.value)} ·{" "}
                  {p.vendor_id ? "vendor" : "platform"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggle(p)}
                className="rounded-[8px] border border-line px-3 py-2 text-xs font-bold hover:border-ink/40"
              >
                {p.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}
              </button>
            </div>
          ))
        )}
      </div>
    </WorkspaceShell>
  );
}

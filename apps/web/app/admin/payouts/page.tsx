"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Bank, Check } from "@phosphor-icons/react";
import { StatusPill, WorkspaceHeader, WorkspaceShell } from "../../components/workspace-shell";
import { useAuth } from "../../components/providers";
import { ApiError, api, formatIDR } from "../../lib/api";

interface Payout {
  id: string;
  amount: number;
  status: string;
  requested_at: string;
  reference: string | null;
  vendor?: { name: string };
}

export default function AdminPayoutsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");

  const query = useQuery({
    queryKey: ["admin-payouts"],
    queryFn: () => api.get<Payout[]>("/admin/payouts", token),
    enabled: Boolean(token),
  });
  const rows = query.data ?? [];

  async function process(id: string) {
    setError("");
    try {
      await api.post(`/admin/payouts/${id}/process`, {}, token);
      await queryClient.invalidateQueries({ queryKey: ["admin-payouts"] });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Gagal memproses.");
    }
  }

  async function fail(id: string) {
    const reason = window.prompt("Alasan payout gagal (dicatat audit, saldo kembali tersedia):");
    if (!reason) return;
    setError("");
    try {
      await api.post(`/admin/payouts/${id}/fail`, { reason }, token);
      await queryClient.invalidateQueries({ queryKey: ["admin-payouts"] });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Gagal menandai.");
    }
  }

  return (
    <WorkspaceShell role="admin" current="/admin/payouts">
      <WorkspaceHeader
        eyebrow="Payouts"
        title="Proses payout vendor."
        description="Proses mencairkan earning PENDING vendor menjadi RELEASED + audit." />
      {error && <p className="mt-4 rounded-[10px] bg-[#f6d9c8] px-4 py-3 text-sm font-semibold text-[#8a3a20]" role="alert">{error}</p>}
      {query.isLoading ? (
        <div className="mt-8 space-y-3" aria-busy="true" aria-label="Memuat payout">
          {[0, 1].map((i) => <div key={i} className="h-20 animate-pulse rounded-[12px] bg-paper" />)}
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-8 rounded-[12px] border border-dashed border-line bg-paper px-5 py-10 text-center text-sm text-ink/55">
          Tidak ada request payout.
        </p>
      ) : (
        <div className="mt-8 space-y-3">
          {rows.map((p) => (
            <article key={p.id} className="flex flex-wrap items-center justify-between gap-4 rounded-[12px] border border-line bg-paper px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-soft text-moss">
                  <Bank size={19} />
                </span>
                <div>
                  <p className="text-sm font-bold">{p.vendor?.name ?? "-"} <span className="font-mono text-xs font-medium text-ink/45">· {p.reference ?? p.id.slice(0, 8)}</span></p>
                  <p className="mt-0.5 text-xs text-ink/50">{p.requested_at.slice(0, 10)} · {formatIDR(p.amount)}</p>
                </div>
              </div>
              {p.status === "PENDING" ? (
                <span className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => process(p.id)} className="inline-flex items-center gap-1.5 rounded-[10px] bg-ink px-4 py-2.5 text-xs font-bold text-paper">
                    <Check size={14} weight="bold" /> Proses payout
                  </button>
                  <button type="button" onClick={() => fail(p.id)} className="rounded-[10px] border border-line px-4 py-2.5 text-xs font-bold hover:border-ink/40">
                    Tandai gagal
                  </button>
                </span>
              ) : (
                <StatusPill status={p.status} />
              )}
            </article>
          ))}
        </div>
      )}
    </WorkspaceShell>
  );
}

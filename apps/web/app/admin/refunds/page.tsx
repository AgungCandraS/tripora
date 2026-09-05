"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Check, X } from "@phosphor-icons/react";
import { StatusPill, WorkspaceHeader, WorkspaceShell } from "../../components/workspace-shell";
import { useAuth } from "../../components/providers";
import { ApiError, api, formatIDR } from "../../lib/api";

interface Refund {
  id: string;
  booking_id: string;
  amount: number;
  reason: string;
  type: string;
  status: string;
}

interface BookingLite {
  id: string;
  booking_code: string;
  booker_name: string;
  vendor?: { name: string };
}

export default function AdminRefundsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");

  const refunds = useQuery({
    queryKey: ["admin-refunds"],
    queryFn: () => api.get<Refund[]>("/refunds", token),
    enabled: Boolean(token),
  });
  const bookings = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: () => api.get<BookingLite[]>("/admin/bookings", token),
    enabled: Boolean(token),
  });

  const rows = refunds.data ?? [];
  const byId = useMemo(() => new Map((bookings.data ?? []).map((b) => [b.id, b])), [bookings.data]);
  const pending = rows.filter((r) => r.status === "PENDING").length;

  async function decide(id: string, ok: boolean) {
    setError("");
    try {
      await api.post(`/refunds/${id}/${ok ? "approve" : "reject"}`, {}, token);
      await queryClient.invalidateQueries({ queryKey: ["admin-refunds"] });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Aksi gagal.");
    }
  }

  return (
    <WorkspaceShell role="admin" current="/admin/refunds">
      <WorkspaceHeader
        eyebrow="Refunds"
        title="Tangani refund."
        description={`${pending} menunggu keputusan. Setiap approve tercatat di audit log.`} />
      {error && <p className="mt-4 rounded-[10px] bg-[#f6d9c8] px-4 py-3 text-sm font-semibold text-[#8a3a20]" role="alert">{error}</p>}
      {refunds.isLoading ? (
        <div className="mt-8 space-y-3" aria-busy="true" aria-label="Memuat refund">
          {[0, 1].map((i) => <div key={i} className="h-24 animate-pulse rounded-[12px] bg-paper" />)}
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-8 rounded-[12px] border border-dashed border-line bg-paper px-5 py-10 text-center text-sm text-ink/55">
          Tidak ada pengajuan refund.
        </p>
      ) : (
        <div className="mt-8 space-y-3">
          {rows.map((r) => {
            const b = byId.get(r.booking_id);
            return (
              <article key={r.id} className="flex flex-wrap items-center justify-between gap-4 rounded-[12px] border border-line bg-paper px-5 py-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <p className="font-mono text-xs font-bold text-coral-dark">{b?.booking_code ?? r.booking_id.slice(0, 8)}</p>
                    <StatusPill status={r.status} />
                  </div>
                  <p className="mt-1.5 text-sm"><strong>{b?.booker_name ?? "-"}</strong> · {b?.vendor?.name ?? "-"}</p>
                  <p className="mt-0.5 text-xs text-ink/50">{r.type} · {r.reason} · {formatIDR(r.amount)}</p>
                </div>
                {r.status === "PENDING" ? (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => decide(r.id, true)} className="inline-flex items-center gap-1.5 rounded-[10px] bg-moss px-4 py-2.5 text-xs font-bold text-paper">
                      <Check size={14} weight="bold" /> Setujui
                    </button>
                    <button type="button" onClick={() => decide(r.id, false)} className="inline-flex items-center gap-1.5 rounded-[10px] border border-line px-4 py-2.5 text-xs font-bold hover:border-ink/40">
                      <X size={14} weight="bold" /> Tolak
                    </button>
                  </div>
                ) : (
                  <span className="text-xs font-semibold text-ink/45">Keputusan tercatat</span>
                )}
              </article>
            );
          })}
        </div>
      )}
    </WorkspaceShell>
  );
}

"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Bank, Check } from "@phosphor-icons/react";
import {
  StatusPill,
  WorkspaceHeader,
  WorkspaceShell,
} from "../../components/workspace-shell";
import { useAuth } from "../../components/providers";
import { ApiError, api, formatIDR } from "../../lib/api";
import { OperationForm } from "../../components/operation-form";

interface Payout {
  id: string;
  amount: number;
  status: string;
  requested_at: string;
  reference: string | null;
  vendor?: { name: string };
}

export default function AdminPayoutsPage() {
  const { authenticated, token } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [action, setAction] = useState<{
    id: string;
    kind: "process" | "fail";
  } | null>(null);

  const query = useQuery({
    queryKey: ["admin-payouts"],
    queryFn: () => api.get<Payout[]>("/admin/payouts", token),
    enabled: Boolean(authenticated),
  });
  const rows = query.data ?? [];

  async function process(id: string, reference: string) {
    setError("");
    try {
      await api.post(`/admin/payouts/${id}/process`, { reference }, token);
      await queryClient.invalidateQueries({ queryKey: ["admin-payouts"] });
      setAction(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Gagal memproses.");
      throw e;
    }
  }

  async function fail(id: string, reason: string) {
    setError("");
    try {
      await api.post(`/admin/payouts/${id}/fail`, { reason }, token);
      await queryClient.invalidateQueries({ queryKey: ["admin-payouts"] });
      setAction(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Gagal menandai.");
      throw e;
    }
  }

  return (
    <WorkspaceShell role="admin" current="/admin/payouts">
      <WorkspaceHeader
        eyebrow="Payouts"
        title="Proses payout vendor."
        description="Catat bukti transfer pendapatan yang memenuhi syarat, termasuk saldo yang tersisa setelah refund parsial."
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
          aria-label="Memuat payout"
        >
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-[12px] bg-paper"
            />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-8 rounded-[12px] border border-dashed border-line bg-paper px-5 py-10 text-center text-sm text-ink/55">
          Tidak ada request payout.
        </p>
      ) : (
        <div className="mt-8 space-y-3">
          {rows.map((p) => (
            <article
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-[12px] border border-line bg-paper px-5 py-4"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-soft text-moss">
                  <Bank size={19} />
                </span>
                <div>
                  <p className="text-sm font-bold">
                    {p.vendor?.name ?? "-"}{" "}
                    <span className="font-mono text-xs font-medium text-ink/45">
                      · {p.reference ?? p.id.slice(0, 8)}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-ink/50">
                    {p.requested_at.slice(0, 10)} · {formatIDR(p.amount)}
                  </p>
                </div>
              </div>
              {action?.id === p.id ? (
                <OperationForm
                  title={
                    action.kind === "process"
                      ? `Konfirmasi transfer ${formatIDR(p.amount)}`
                      : "Tandai pencairan gagal"
                  }
                  label={
                    action.kind === "process"
                      ? "Nomor referensi transfer bank yang sudah berhasil"
                      : "Alasan kegagalan"
                  }
                  submitLabel={
                    action.kind === "process"
                      ? "Catat transfer berhasil"
                      : "Simpan kegagalan"
                  }
                  onCancel={() => setAction(null)}
                  onConfirm={(value) =>
                    action.kind === "process"
                      ? process(p.id, value)
                      : fail(p.id, value)
                  }
                />
              ) : p.status === "PENDING" ? (
                <span className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setAction({ id: p.id, kind: "process" });
                    }}
                    className="inline-flex items-center gap-1.5 rounded-[10px] bg-ink px-4 py-2.5 text-xs font-bold text-paper"
                  >
                    <Check size={14} weight="bold" /> Catat transfer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setAction({ id: p.id, kind: "fail" });
                    }}
                    className="rounded-[10px] border border-line px-4 py-2.5 text-xs font-bold hover:border-ink/40"
                  >
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

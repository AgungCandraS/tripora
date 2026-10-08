"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "@phosphor-icons/react";
import { useState } from "react";
import {
  Metric,
  StatusPill,
  WorkspaceHeader,
  WorkspaceShell,
} from "../../components/workspace-shell";
import { useAuth } from "../../components/providers";
import { ApiError, api, formatIDR } from "../../lib/api";

interface Payout {
  id: string;
  amount: number;
  status: string;
  requested_at: string;
  reference: string | null;
}

export default function VendorPayoutsPage() {
  const { authenticated, token } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const query = useQuery({
    queryKey: ["vendor-payouts"],
    queryFn: () => api.get<Payout[]>("/vendor/payouts", token),
    enabled: Boolean(authenticated),
  });
  const rows = Array.isArray(query.data)
    ? query.data
    : ((query.data as unknown as { payouts?: Payout[] })?.payouts ?? []);
  const balance = useQuery({
    queryKey: ["vendor-payout-balance"],
    queryFn: () =>
      api.get<{ available: number; minimum: number }>(
        "/vendor/payouts/balance",
        token,
      ),
    enabled: Boolean(authenticated),
  });
  const available = balance.data?.available ?? 0;
  const minimum = balance.data?.minimum ?? 0;
  const done = rows.filter((p) => p.status === "PROCESSED");
  const pending = rows.filter((p) => p.status === "PENDING");
  const sum = (xs: Payout[]) => xs.reduce((a, p) => a + p.amount, 0);

  async function request() {
    setError("");
    setBusy(true);
    try {
      await api.post("/vendor/payouts", {}, token);
      await queryClient.invalidateQueries({ queryKey: ["vendor-payouts"] });
      await queryClient.invalidateQueries({
        queryKey: ["vendor-payout-balance"],
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Gagal request payout.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <WorkspaceShell role="vendor" current="/vendor/payouts">
      <WorkspaceHeader
        eyebrow="Payout"
        title="Settlement & payout."
        description="Ajukan pencairan pendapatan yang sudah memenuhi syarat. Saldo yang diajukan dicadangkan hingga transfer dikonfirmasi."
      />
      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        <Metric
          label="Saldo tersedia"
          value={balance.isLoading ? "…" : formatIDR(available)}
          hint={`Minimum ${formatIDR(minimum)}`}
        />
        <Metric
          label="Dalam proses"
          value={formatIDR(sum(pending))}
          hint={`${pending.length} request`}
        />
        <Metric
          label="Total dicairkan"
          value={formatIDR(sum(done))}
          hint={`${done.length} payout`}
        />
      </div>
      <div className="mt-8 rounded-[12px] border border-line bg-paper p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold">Cairkan saldo</h2>
            <p className="mt-1 text-xs text-ink/50">
              Status selesai setelah admin mencatat bukti transfer.
            </p>
          </div>
          <button
            type="button"
            onClick={request}
            disabled={
              busy ||
              balance.isPending ||
              balance.isError ||
              pending.length > 0 ||
              available < minimum
            }
            className="rounded-[10px] bg-ink px-5 py-3 text-sm font-bold text-paper disabled:opacity-50"
            title={
              available < minimum
                ? `Saldo belum mencapai minimum ${formatIDR(minimum)}`
                : "Request payout"
            }
          >
            {busy ? "Memproses…" : "Request payout"}
          </button>
        </div>
        {error && (
          <p className="mt-3 text-xs font-bold text-coral-dark" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="mt-5 space-y-3">
        {query.isLoading ? (
          <div
            className="h-24 animate-pulse rounded-[12px] bg-paper"
            aria-busy="true"
            aria-label="Memuat payout"
          />
        ) : rows.length === 0 ? (
          <p className="rounded-[12px] border border-dashed border-line bg-paper px-5 py-10 text-center text-sm text-ink/55">
            Belum ada payout. Request pertama muncul di sini.
          </p>
        ) : (
          rows.map((h) => (
            <div
              key={h.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-line bg-paper px-5 py-4"
            >
              <div>
                <p className="font-mono text-xs font-bold">
                  {h.reference ?? h.id.slice(0, 8)}
                </p>
                <p className="mt-0.5 text-xs text-ink/50">
                  {h.requested_at.slice(0, 10)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold">{formatIDR(h.amount)}</span>
                <StatusPill
                  status={
                    h.status === "PROCESSED" ? "COMPLETED" : "PENDING_PAYMENT"
                  }
                />
              </div>
            </div>
          ))
        )}
        {done.length > 0 && (
          <p
            className="inline-flex items-center gap-2 text-xs font-bold text-moss"
            role="status"
          >
            <Check size={15} weight="bold" /> {done.length} payout selesai
            diproses admin.
          </p>
        )}
      </div>
    </WorkspaceShell>
  );
}

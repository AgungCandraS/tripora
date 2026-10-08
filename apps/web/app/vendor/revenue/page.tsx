"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  Metric,
  WorkspaceHeader,
  WorkspaceShell,
} from "../../components/workspace-shell";
import { useAuth } from "../../components/providers";
import { api, formatIDR } from "../../lib/api";

interface Earning {
  id: string;
  gross_amount: number;
  commission_amount: number;
  refund_amount: number;
  net_amount: number;
  settlement_status: string;
  booking: {
    booking_code: string;
    status: string;
    participant_count: number;
    activity?: { title: string };
  };
}

export default function VendorRevenuePage() {
  const { authenticated, token } = useAuth();
  const query = useQuery({
    queryKey: ["vendor-earnings"],
    queryFn: () => api.get<{ earnings: Earning[] }>("/vendor/earnings", token),
    enabled: Boolean(authenticated),
  });
  const sums = useMemo(
    () =>
      (query.data?.earnings ?? []).reduce(
        (a, r) => ({
          gross: a.gross + r.gross_amount,
          commission: a.commission + r.commission_amount,
          net: a.net + r.net_amount - r.refund_amount,
        }),
        { gross: 0, commission: 0, net: 0 },
      ),
    [query.data],
  );
  const rows = query.data?.earnings ?? [];

  return (
    <WorkspaceShell role="vendor" current="/vendor/revenue">
      <WorkspaceHeader
        eyebrow="Revenue"
        title="Pendapatan & komisi."
        description="Pantau nilai pemesanan, komisi, dan pendapatan bersih berdasarkan riwayat transaksi."
      />
      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        <Metric
          label="Nilai pemesanan"
          value={formatIDR(sums.gross)}
          hint={`${rows.length} booking`}
        />
        <Metric
          label="Komisi platform"
          value={formatIDR(sums.commission)}
          hint="Tercatat saat pemesanan"
        />
        <Metric
          label="Vendor net"
          value={formatIDR(sums.net)}
          hint="Setelah pengembalian dana"
        />
      </div>
      {query.isLoading ? (
        <div
          className="mt-8 h-64 animate-pulse rounded-[12px] bg-paper"
          aria-busy="true"
          aria-label="Memuat revenue"
        />
      ) : query.isError ? (
        <p className="mt-8 rounded-[12px] border border-line bg-paper px-5 py-8 text-center text-sm text-ink/55">
          Gagal memuat.{" "}
          <button
            type="button"
            onClick={() => query.refetch()}
            className="font-bold text-coral-dark underline underline-offset-4"
          >
            Coba lagi
          </button>
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-8 rounded-[12px] border border-dashed border-line bg-paper px-5 py-10 text-center text-sm text-ink/55">
          Belum ada earning — muncul otomatis saat booking CONFIRMED.
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-[12px] border border-line bg-paper">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.1em] text-ink/45">
                <th className="px-5 py-3 font-bold">Kode</th>
                <th className="px-5 py-3 font-bold">Aktivitas</th>
                <th className="px-5 py-3 text-right font-bold">Nilai pemesanan</th>
                <th className="px-5 py-3 text-right font-bold">Komisi</th>
                <th className="px-5 py-3 text-right font-bold">Net</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-3.5 font-mono text-xs font-bold text-coral-dark">
                    {r.booking.booking_code}
                  </td>
                  <td className="px-5 py-3.5">
                    {r.booking.activity?.title ?? "-"} ·{" "}
                    {r.booking.participant_count} pax
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold">
                    {formatIDR(r.gross_amount)}
                  </td>
                  <td className="px-5 py-3.5 text-right text-ink/55">
                    {formatIDR(r.commission_amount)}
                  </td>
                  <td className="px-5 py-3.5 text-right font-bold">
                    {formatIDR(r.net_amount - r.refund_amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </WorkspaceShell>
  );
}

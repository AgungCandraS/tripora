"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Metric, StatusPill, WorkspaceHeader, WorkspaceShell } from "../../components/workspace-shell";
import { useAuth } from "../../components/providers";
import { api, formatIDR } from "../../lib/api";

interface BookingRow {
  id: string;
  booking_code: string;
  booker_name: string;
  total_amount: number;
  commission_amount: number;
  vendor_net_amount: number;
  status: string;
  payment?: { provider: string } | null;
  vendor?: { name: string };
}

interface RefundRow {
  id: string;
  status: string;
}

export default function AdminTransactionsPage() {
  const { token } = useAuth();
  const bookings = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: () => api.get<BookingRow[]>("/admin/bookings", token),
    enabled: Boolean(token),
  });
  const refunds = useQuery({
    queryKey: ["admin-refunds"],
    queryFn: () => api.get<RefundRow[]>("/refunds", token),
    enabled: Boolean(token),
  });

  const rows = bookings.data ?? [];
  const gross = rows.reduce((a, b) => a + b.total_amount, 0);
  const commission = rows.reduce((a, b) => a + (b.commission_amount ?? 0), 0);
  const paid = rows.filter((b) => ["PAID", "CONFIRMED", "CHECKED_IN", "COMPLETED"].includes(b.status)).length;
  const refundPending = (refunds.data ?? []).filter((r) => r.status === "PENDING").length;

  return (
    <WorkspaceShell role="admin" current="/admin/transactions">
      <WorkspaceHeader
        eyebrow="Transaction monitoring"
        title="Transaksi & settlement."
        description="Gross, komisi snapshot, vendor net per booking — read-only, semua beraudit." />
      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Gross" value={bookings.isLoading ? "…" : formatIDR(gross)} hint={`${rows.length} booking`} />
        <Metric label="Komisi platform" value={bookings.isLoading ? "…" : formatIDR(commission)} hint="Snapshot per transaksi" />
        <Metric label="Paid success" value={bookings.isLoading ? "…" : `${rows.length ? Math.round((paid / rows.length) * 100) : 0}%`} hint="Webhook terverifikasi" />
        <Metric label="Refund pending" value={refunds.isLoading ? "…" : String(refundPending)} hint="Perlu keputusan" />
      </div>
      {bookings.isLoading ? (
        <div className="mt-8 h-64 animate-pulse rounded-[12px] bg-paper" aria-busy="true" aria-label="Memuat transaksi" />
      ) : rows.length === 0 ? (
        <p className="mt-8 rounded-[12px] border border-dashed border-line bg-paper px-5 py-10 text-center text-sm text-ink/55">
          Belum ada transaksi.
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-[12px] border border-line bg-paper">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.1em] text-ink/45">
                <th className="px-5 py-3 font-bold">Kode</th>
                <th className="px-5 py-3 font-bold">Vendor</th>
                <th className="px-5 py-3 text-right font-bold">Gross</th>
                <th className="px-5 py-3 text-right font-bold">Komisi</th>
                <th className="px-5 py-3 text-right font-bold">Net</th>
                <th className="px-5 py-3 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-3.5">
                    <Link href={`/booking/${r.booking_code}`} className="font-mono text-xs font-bold text-coral-dark">
                      {r.booking_code}
                    </Link>
                    <p className="mt-0.5 text-[11px] text-ink/45">{r.payment?.provider ?? "mayar"}</p>
                  </td>
                  <td className="px-5 py-3.5">{r.vendor?.name ?? "-"}</td>
                  <td className="px-5 py-3.5 text-right font-semibold">{formatIDR(r.total_amount)}</td>
                  <td className="px-5 py-3.5 text-right text-ink/55">{formatIDR(r.commission_amount ?? 0)}</td>
                  <td className="px-5 py-3.5 text-right font-bold">{formatIDR(r.vendor_net_amount ?? 0)}</td>
                  <td className="px-5 py-3.5"><StatusPill status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </WorkspaceShell>
  );
}

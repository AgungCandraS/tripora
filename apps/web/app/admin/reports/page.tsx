"use client";

import { useQuery } from "@tanstack/react-query";
import { Export } from "@phosphor-icons/react";
import { Metric, WorkspaceHeader, WorkspaceShell } from "../../components/workspace-shell";
import { useAuth } from "../../components/providers";
import { api, formatIDR } from "../../lib/api";

interface Overview {
  gross: number;
  bookings: number;
  vendors: number;
  publishedActivities: number;
  refundsPending: number;
}

interface BookingRow {
  booking_code: string;
  booker_name: string;
  booker_email: string;
  booking_date: string;
  slot_start: string;
  participant_count: number;
  status: string;
  total_amount: number;
  commission_amount: number;
  vendor_net_amount: number;
  vendor?: { name: string };
  activity?: { title: string };
}

function toCSV(rows: BookingRow[]): string {
  const head = "booking_code,tanggal,slot,vendor,aktivitas,customer,pax,status,total,komisi,net";
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = rows.map((b) => [
    b.booking_code, b.booking_date.slice(0, 10), b.slot_start, b.vendor?.name ?? "",
    b.activity?.title ?? "", b.booker_name, b.participant_count, b.status,
    b.total_amount, b.commission_amount ?? 0, b.vendor_net_amount ?? 0,
  ].map(esc).join(","));
  return [head, ...lines].join("\n");
}

export default function AdminReportsPage() {
  const { token } = useAuth();
  const overview = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => api.get<Overview>("/admin/analytics/overview", token),
    enabled: Boolean(token),
  });
  const bookings = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: () => api.get<BookingRow[]>("/admin/bookings", token),
    enabled: Boolean(token),
  });

  const o = overview.data;
  const rows = bookings.data ?? [];

  function downloadCSV() {
    const blob = new Blob([toCSV(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tripora-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <WorkspaceShell role="admin" current="/admin/reports">
      <WorkspaceHeader
        eyebrow="Reports"
        title="Laporan operasional."
        description="Angka live dari database. Export mengunduh CSV booking saat ini." />
      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Gross" value={o ? formatIDR(o.gross) : "…"} hint={`${o?.bookings ?? "…"} booking`} />
        <Metric label="Vendor" value={o ? String(o.vendors) : "…"} hint="terdaftar" />
        <Metric label="Listing published" value={o ? String(o.publishedActivities) : "…"} hint="live di storefront" />
        <Metric label="Refund pending" value={o ? String(o.refundsPending) : "…"} hint="perlu keputusan" />
      </div>
      <div className="mt-8 rounded-[12px] border border-line bg-paper p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold">Export booking CSV</h2>
            <p className="mt-1 text-xs text-ink/50">{rows.length} baris · kode, vendor, customer, finansial.</p>
          </div>
          <button
            type="button"
            onClick={downloadCSV}
            disabled={rows.length === 0}
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-ink px-4 py-3 text-sm font-bold text-paper disabled:opacity-50"
          >
            <Export size={16} /> Unduh CSV
          </button>
        </div>
      </div>
    </WorkspaceShell>
  );
}

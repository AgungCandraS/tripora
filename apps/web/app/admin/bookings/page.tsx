"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  StatusPill,
  WorkspaceHeader,
  WorkspaceShell,
} from "../../components/workspace-shell";
import { useAuth } from "../../components/providers";
import { api, formatIDR } from "../../lib/api";

interface Row {
  id: string;
  booking_code: string;
  booker_name: string;
  total_amount: number;
  status: string;
  vendor?: { name: string };
}

export default function AdminBookingsPage() {
  const { authenticated, token } = useAuth();
  const query = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: () => api.get<Row[]>("/admin/bookings", token),
    enabled: Boolean(authenticated),
  });
  const rows = query.data ?? [];

  return (
    <WorkspaceShell role="admin" current="/admin/bookings">
      <WorkspaceHeader
        eyebrow="Booking monitor"
        title="Transaksi marketplace."
        description="Lifecycle booking semua vendor — read-only, perubahan status hanya lewat alur resmi."
      />
      {query.isLoading ? (
        <div
          className="mt-8 h-64 animate-pulse rounded-[14px] bg-paper"
          aria-busy="true"
          aria-label="Memuat booking"
        />
      ) : rows.length === 0 ? (
        <p className="mt-8 rounded-[14px] border border-dashed border-line bg-paper px-5 py-10 text-center text-sm text-ink/55">
          Belum ada booking di platform.
        </p>
      ) : (
        <div className="mt-8 overflow-hidden rounded-[14px] border border-line bg-paper">
          <div className="hidden grid-cols-[0.9fr_1.2fr_0.9fr_0.7fr_0.9fr] gap-4 border-b border-line px-5 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-ink/45 sm:grid">
            <span>Kode</span>
            <span>Vendor</span>
            <span>Customer</span>
            <span>Total</span>
            <span>Status</span>
          </div>
          {rows.map((b) => (
            <div
              key={b.id}
              className="grid gap-2 border-b border-line px-5 py-4 last:border-0 sm:grid-cols-[0.9fr_1.2fr_0.9fr_0.7fr_0.9fr] sm:items-center sm:gap-4"
            >
              <Link
                href={`/booking/${b.booking_code}`}
                className="font-mono text-xs font-bold text-coral-dark"
              >
                {b.booking_code}
              </Link>
              <span className="text-sm font-semibold">
                {b.vendor?.name ?? "-"}
              </span>
              <span className="text-sm text-ink/65">{b.booker_name}</span>
              <span className="text-sm font-semibold">
                {formatIDR(b.total_amount)}
              </span>
              <StatusPill status={b.status} />
            </div>
          ))}
        </div>
      )}
    </WorkspaceShell>
  );
}

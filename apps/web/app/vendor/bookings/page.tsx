"use client";

import { useQuery } from "@tanstack/react-query";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import {
  StatusPill,
  WorkspaceHeader,
  WorkspaceShell,
} from "../../components/workspace-shell";
import { useAuth } from "../../components/providers";
import { api, formatIDR } from "../../lib/api";

interface VendorBooking {
  id: string;
  booking_code: string;
  booker_name: string;
  booking_date: string;
  slot_start: string;
  participant_count: number;
  status: string;
  total_amount: number;
  activity?: { title: string };
}

const FILTERS = [
  "Semua",
  "PENDING_PAYMENT",
  "PAID",
  "CONFIRMED",
  "CHECKED_IN",
  "COMPLETED",
  "CANCELLED",
];

export default function VendorBookingsPage() {
  const { authenticated, token } = useAuth();
  const [status, setStatus] = useState("Semua");
  const [q, setQ] = useState("");

  const query = useQuery({
    queryKey: ["vendor-bookings"],
    queryFn: () =>
      api.get<{ bookings: VendorBooking[] }>("/vendor/bookings", token),
    enabled: Boolean(authenticated),
  });

  const rows = useMemo(() => {
    const all = query.data?.bookings ?? [];
    return all.filter((b) => {
      const okStatus = status === "Semua" || b.status === status;
      const needle = q.trim().toLowerCase();
      const okQ =
        !needle ||
        `${b.booking_code} ${b.booker_name}`.toLowerCase().includes(needle);
      return okStatus && okQ;
    });
  }, [query.data, status, q]);

  return (
    <WorkspaceShell role="vendor" current="/vendor/bookings">
      <WorkspaceHeader
        eyebrow="Bookings"
        title="Booking masuk dan jadwal."
        description="Data live dari backend, terisolasi per vendor_id milikmu."
      />
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-[10px] border border-line bg-paper px-3.5 py-2.5">
          <MagnifyingGlass size={17} className="shrink-0 text-ink/40" />
          <span className="sr-only">Cari kode atau nama</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari kode / nama guest…"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink/35"
          />
        </label>
        <div
          className="flex flex-wrap gap-1.5"
          role="tablist"
          aria-label="Filter status"
        >
          {FILTERS.map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={status === f}
              onClick={() => setStatus(f)}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${status === f ? "border-ink bg-ink text-paper" : "border-line text-ink/60 hover:border-ink/40"}`}
            >
              {f === "Semua" ? "Semua" : f.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>
      {query.isLoading ? (
        <div
          className="mt-6 space-y-3"
          aria-busy="true"
          aria-label="Memuat booking"
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-[12px] bg-paper"
            />
          ))}
        </div>
      ) : query.isError ? (
        <p className="mt-6 rounded-[12px] border border-line bg-paper px-5 py-8 text-center text-sm text-ink/55">
          Gagal memuat booking.{" "}
          <button
            type="button"
            onClick={() => query.refetch()}
            className="font-bold text-coral-dark underline underline-offset-4"
          >
            Coba lagi
          </button>
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-6 rounded-[12px] border border-dashed border-line bg-paper px-5 py-10 text-center text-sm text-ink/55">
          {query.data?.bookings.length
            ? "Tidak ada booking yang cocok dengan filter."
            : "Belum ada booking masuk untuk vendormu."}
        </p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-[12px] border border-line bg-paper">
          <div className="hidden grid-cols-[0.9fr_1fr_1.2fr_0.6fr_0.6fr_0.8fr_0.8fr] gap-3 border-b border-line px-5 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-ink/45 lg:grid">
            <span>Kode</span>
            <span>Guest</span>
            <span>Aktivitas</span>
            <span>Tanggal</span>
            <span>Slot</span>
            <span>Total</span>
            <span>Status</span>
          </div>
          {rows.map((row) => (
            <div
              key={row.id}
              className="grid gap-1.5 border-b border-line px-5 py-4 last:border-0 sm:grid-cols-[0.9fr_1fr_1.2fr_0.6fr_0.6fr_0.8fr_0.8fr] sm:items-center sm:gap-3"
            >
              <span className="font-mono text-xs font-bold text-coral-dark">
                {row.booking_code}
              </span>
              <span className="text-sm font-semibold">
                {row.booker_name}{" "}
                <span className="text-xs font-normal text-ink/45">
                  · {row.participant_count} pax
                </span>
              </span>
              <span className="text-sm text-ink/65">
                {row.activity?.title ?? "-"}
              </span>
              <span className="text-xs text-ink/55">
                {row.booking_date.slice(0, 10)}
              </span>
              <span className="text-xs font-bold">{row.slot_start}</span>
              <span className="text-sm font-bold">
                {formatIDR(row.total_amount)}
              </span>
              <StatusPill status={row.status} />
            </div>
          ))}
        </div>
      )}
      <p className="mt-3 text-xs text-ink/45" role="status">
        {rows.length} booking ditampilkan.
      </p>
    </WorkspaceShell>
  );
}

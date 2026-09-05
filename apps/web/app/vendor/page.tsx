"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Metric, WorkspaceHeader, WorkspaceShell } from "../components/workspace-shell";
import { useAuth } from "../components/providers";
import { api, formatIDR } from "../lib/api";
import type { ApiActivity } from "../lib/types";

interface BookingLite {
  id: string;
  booking_code: string;
  booker_name: string;
  booking_date: string;
  slot_start: string;
  participant_count: number;
  status: string;
  activity?: { title: string };
}

interface EarningLite {
  gross_amount: number;
  commission_amount: number;
  net_amount: number;
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function VendorPage() {
  const { token } = useAuth();
  const bookings = useQuery({
    queryKey: ["vendor-bookings"],
    queryFn: () => api.get<{ bookings: BookingLite[] }>("/vendor/bookings", token),
    enabled: Boolean(token),
  });
  const activities = useQuery({
    queryKey: ["vendor-activities"],
    queryFn: () => api.get<ApiActivity[]>("/vendor/activities", token),
    enabled: Boolean(token),
  });
  const earnings = useQuery({
    queryKey: ["vendor-earnings"],
    queryFn: () => api.get<{ earnings: EarningLite[] }>("/vendor/earnings", token),
    enabled: Boolean(token),
  });

  const all = bookings.data?.bookings ?? [];
  const today = todayISO();
  const todays = all.filter((b) => b.booking_date.slice(0, 10) === today);
  const todaysPax = todays.reduce((a, b) => a + b.participant_count, 0);
  const acts = activities.data ?? [];
  const published = acts.filter((a) => a.status === "PUBLISHED").length;
  const draft = acts.filter((a) => a.status === "DRAFT").length;
  const review = acts.filter((a) => a.status === "IN_REVIEW").length;
  const net = (earnings.data?.earnings ?? []).reduce((a, e) => a + e.net_amount, 0);
  const loading = bookings.isLoading || activities.isLoading || earnings.isLoading;

  return (
    <WorkspaceShell role="vendor" current="/vendor">
      <WorkspaceHeader eyebrow="Vendor workspace" title="Operasional hari ini." description="Pantau booking, kapasitas, dan performa aktivitas dari satu ruang kerja." />
      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Booking hari ini" value={loading ? "…" : String(todays.length)} hint={`${todaysPax} peserta`} />
        <Metric label="Total booking" value={loading ? "…" : String(all.length)} hint="Semua waktu" />
        <Metric label="Listing published" value={loading ? "…" : String(published)} hint={`dari ${acts.length} aktivitas`} />
        <Metric label="Vendor net" value={loading ? "…" : formatIDR(net)} hint="Akumulasi earning" />
      </div>
      <div className="mt-10 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[14px] border border-line bg-paper p-5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-coral-dark">Today · {today}</p>
              <h2 className="mt-2 text-xl font-bold">Jadwal keberangkatan</h2>
            </div>
            <Link href="/vendor/bookings" className="text-sm font-semibold text-ink/60 underline underline-offset-4">Semua booking</Link>
          </div>
          <div className="mt-5 space-y-3">
            {todays.length === 0 ? (
              <p className="rounded-[10px] bg-soft px-4 py-4 text-sm text-ink/55">Tidak ada keberangkatan hari ini.</p>
            ) : (
              todays.slice(0, 5).map((b) => (
                <div key={b.id} className="rounded-[10px] bg-soft px-4 py-3 text-sm font-semibold">
                  {b.slot_start} · {b.activity?.title} · {b.participant_count} peserta · {b.status.replace(/_/g, " ")}
                </div>
              ))
            )}
          </div>
        </section>
        <section className="rounded-[14px] bg-ink p-5 text-paper">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-coral">Listing health</p>
          <h2 className="mt-2 text-xl font-bold">Aktivitas tetap siap ditemukan.</h2>
          <div className="mt-6 space-y-4 text-sm">
            <div className="flex justify-between"><span className="text-paper/60">Published</span><strong>{published}</strong></div>
            <div className="flex justify-between"><span className="text-paper/60">Draft</span><strong>{draft}</strong></div>
            <div className="flex justify-between"><span className="text-paper/60">Perlu review</span><strong className="text-coral">{review}</strong></div>
          </div>
          <Link href="/vendor/activities" className="mt-7 inline-flex text-sm font-bold text-paper underline underline-offset-4 hover:text-coral">
            Kelola aktivitas →
          </Link>
        </section>
      </div>
    </WorkspaceShell>
  );
}

"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { ActivityCard } from "../components/activity-card";
import { Metric, StatusPill, WorkspaceHeader, WorkspaceShell } from "../components/workspace-shell";
import { useAuth } from "../components/providers";
import { api, formatIDR } from "../lib/api";
import type { ApiActivity, ApiBooking } from "../lib/types";

export default function AccountPage() {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const trips = useQuery({
    queryKey: ["my-trips"],
    queryFn: () => api.get<{ bookings: ApiBooking[] }>("/me/trips", token),
    enabled: Boolean(token),
  });
  const wishlist = useQuery({
    queryKey: ["wishlist"],
    queryFn: () => api.get<{ wishlist: Array<{ activity: ApiActivity }> }>("/me/wishlist", token),
    enabled: Boolean(token),
  });
  const recommended = useQuery({
    queryKey: ["recommended"],
    queryFn: () => api.get<{ activities: ApiActivity[] }>("/search"),
  });

  const bookings = trips.data?.bookings ?? [];
  const active = bookings.filter((b) => ["PENDING_PAYMENT", "PAID", "CONFIRMED"].includes(b.status));
  const done = bookings.filter((b) => ["COMPLETED", "CHECKED_IN"].includes(b.status));
  const upcoming = [...bookings].sort((a, b) => a.booking_date.localeCompare(b.booking_date))[0] ?? null;

  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    try {
      await api.patch("/me/profile", {
        ...(name !== null ? { full_name: name } : {}),
        ...(phone !== null ? { phone } : {}),
      }, token);
      setSaved(true);
      await queryClient.invalidateQueries({ queryKey: ["my-trips"] });
    } catch { /* abaikan */ }
  }

  return (
    <WorkspaceShell role="customer" current="/account">
      <WorkspaceHeader eyebrow="Customer account" title="Rencana perjalananmu." description="Kelola profil, booking, wishlist, dan ulasan dari satu tempat." />
      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        <Metric label="Booking aktif" value={trips.isLoading ? "…" : String(active.length)} hint="Menunggu keberangkatan" />
        <Metric label="Wishlist" value={wishlist.isLoading ? "…" : String(wishlist.data?.wishlist.length ?? 0)} hint="Pengalaman tersimpan" />
        <Metric label="Trip selesai" value={trips.isLoading ? "…" : String(done.length)} hint="Siap diberi ulasan" />
      </div>

      <section className="mt-10 rounded-[14px] border border-line bg-paper p-5">
        <h2 className="text-lg font-bold tracking-[-0.03em]">Profil</h2>
        <form onSubmit={saveProfile} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-ink/45">Nama</span>
            <input defaultValue={user?.full_name ?? ""} onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full rounded-[10px] border border-line bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-coral-dark" />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-ink/45">WhatsApp</span>
            <input defaultValue="" onChange={(e) => setPhone(e.target.value)} placeholder="08…"
              className="mt-2 w-full rounded-[10px] border border-line bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-coral-dark" />
          </label>
          <div className="flex items-center gap-3 sm:col-span-2">
            <button type="submit" className="rounded-[10px] bg-ink px-4 py-2.5 text-sm font-bold text-paper">Simpan profil</button>
            {saved && <span className="text-xs font-bold text-moss" role="status">Tersimpan.</span>}
            <span className="font-mono text-xs text-ink/45">{user?.email}</span>
          </div>
        </form>
      </section>

      <section className="mt-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-coral-dark">Upcoming</p>
            <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em]">Booking berikutnya</h2>
          </div>
          <Link href="/account/trips" className="text-sm font-semibold text-ink/60 underline underline-offset-4">Lihat semua</Link>
        </div>
        {trips.isLoading ? (
          <div className="mt-5 h-24 animate-pulse rounded-[14px] bg-paper" aria-busy="true" aria-label="Memuat booking" />
        ) : !upcoming ? (
          <p className="mt-5 rounded-[14px] border border-dashed border-line bg-paper px-5 py-8 text-center text-sm text-ink/55">
            Belum ada booking. <Link href="/explore" className="font-bold text-coral-dark underline underline-offset-4">Explore dulu</Link>
          </p>
        ) : (
          <div className="mt-5 grid gap-4 rounded-[14px] border border-line bg-paper p-5 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-coral-dark">{upcoming.booking_date.slice(0, 10)} · {upcoming.slot_start}</p>
              <h3 className="mt-2 text-xl font-bold">{upcoming.activity?.title}</h3>
              <p className="mt-2 text-sm text-ink/60">{upcoming.participant_count} peserta · {formatIDR(upcoming.total_amount)}</p>
            </div>
            <StatusPill status={upcoming.status} />
          </div>
        )}
      </section>

      <section className="mt-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-coral-dark">Recommended</p>
            <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em]">Mungkin kamu suka</h2>
          </div>
          <Link href="/explore" className="text-sm font-semibold text-ink/60 underline underline-offset-4">Explore</Link>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {(recommended.data?.activities ?? []).slice(0, 3).map((activity, i) => (
            <ActivityCard key={activity.id} activity={activity} index={i} />
          ))}
        </div>
      </section>
    </WorkspaceShell>
  );
}

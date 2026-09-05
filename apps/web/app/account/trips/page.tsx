"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { StatusPill, WorkspaceHeader, WorkspaceShell } from "../../components/workspace-shell";
import { useAuth } from "../../components/providers";
import { api, formatIDR } from "../../lib/api";
import type { ApiBooking } from "../../lib/types";

export default function TripsPage() {
  const { token } = useAuth();
  const query = useQuery({
    queryKey: ["my-trips"],
    queryFn: () => api.get<{ bookings: ApiBooking[] }>("/me/trips", token),
    enabled: Boolean(token),
  });
  const trips = query.data?.bookings ?? [];

  return (
    <WorkspaceShell role="customer" current="/account/trips">
      <WorkspaceHeader eyebrow="My Trips" title="Booking dan riwayat perjalanan." description="Trip dari akunmu. Booking guest dilacak via My Trips lookup." />
      {query.isLoading ? (
        <div className="mt-8 space-y-3" aria-busy="true" aria-label="Memuat trip">
          {[0, 1].map((i) => <div key={i} className="h-24 animate-pulse rounded-[14px] bg-paper" />)}
        </div>
      ) : trips.length === 0 ? (
        <p className="mt-8 rounded-[14px] border border-dashed border-line bg-paper px-5 py-10 text-center text-sm text-ink/55">
          Belum ada trip. <Link href="/explore" className="font-bold text-coral-dark underline underline-offset-4">Mulai explore</Link>
        </p>
      ) : (
        <div className="mt-8 space-y-3">
          {trips.map((trip) => (
            <article key={trip.id} className="grid gap-3 rounded-[14px] border border-line bg-paper p-5 sm:grid-cols-[1fr_auto_auto] sm:items-center">
              <div>
                <p className="font-mono text-xs font-bold tracking-[0.08em] text-ink/45">{trip.booking_code}</p>
                <h2 className="mt-1.5 font-bold">{trip.activity?.title ?? "-"}</h2>
                <p className="mt-1 text-sm text-ink/55">
                  {trip.booking_date.slice(0, 10)} · {trip.slot_start} · {trip.participant_count} peserta · {formatIDR(trip.total_amount)}
                </p>
              </div>
              <StatusPill status={trip.status} />
              <Link href={`/booking/${trip.booking_code}`} className="text-sm font-bold text-coral-dark underline underline-offset-4">
                Lihat detail
              </Link>
            </article>
          ))}
        </div>
      )}
    </WorkspaceShell>
  );
}

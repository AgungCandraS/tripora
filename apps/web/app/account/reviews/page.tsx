"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { StatusPill, WorkspaceHeader, WorkspaceShell } from "../../components/workspace-shell";
import { useAuth } from "../../components/providers";
import { api } from "../../lib/api";
import type { ApiBooking } from "../../lib/types";

interface MyReview {
  id: string;
  rating: number;
  body: string;
  activity: { title: string; slug: string };
  booking: { booking_code: string; status: string };
}

export default function AccountReviewsPage() {
  const { token } = useAuth();
  const reviews = useQuery({
    queryKey: ["my-reviews"],
    queryFn: () => api.get<{ reviews: MyReview[] }>("/reviews/mine/list", token),
    enabled: Boolean(token),
  });
  const trips = useQuery({
    queryKey: ["my-trips"],
    queryFn: () => api.get<{ bookings: ApiBooking[] }>("/me/trips", token),
    enabled: Boolean(token),
  });

  const done = reviews.data?.reviews ?? [];
  const pending = (trips.data?.bookings ?? []).filter(
    (b) => b.status === "COMPLETED" && !b.review
  );

  return (
    <WorkspaceShell role="customer" current="/account/reviews">
      <WorkspaceHeader
        eyebrow="Reviews"
        title="Ulasan terverifikasi."
        description="Ulasan hanya bisa dikirim untuk trip COMPLETED milik akunmu." />
      {reviews.isLoading ? (
        <div className="mt-8 h-32 animate-pulse rounded-[12px] bg-paper" aria-busy="true" aria-label="Memuat ulasan" />
      ) : done.length === 0 ? (
        <p className="mt-8 rounded-[12px] border border-dashed border-line bg-paper px-5 py-10 text-center text-sm text-ink/55">
          Belum ada ulasan terkirim.
        </p>
      ) : (
        <div className="mt-8 space-y-4">
          {done.map((r) => (
            <article key={r.id} className="rounded-[12px] border border-line bg-paper p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-bold">{r.activity.title}</h2>
                <StatusPill status="COMPLETED" />
              </div>
              <p className="mt-1 flex items-center gap-1 text-sm font-bold">
                <span aria-hidden="true" className="text-[15px] leading-none text-coral-dark">★</span> {r.rating},0
                <span className="ml-2 font-mono text-xs font-medium text-ink/45">{r.booking.booking_code}</span>
              </p>
              <p className="mt-2.5 text-sm leading-6 text-ink/65">“{r.body}”</p>
            </article>
          ))}
        </div>
      )}
      <h2 className="mt-10 text-lg font-bold">Menunggu bisa diulas ({pending.length})</h2>
      {pending.length === 0 ? (
        <p className="mt-4 rounded-[12px] bg-soft px-5 py-6 text-sm text-ink/60">
          Tidak ada trip COMPLETED yang belum diulas.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {pending.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] bg-soft px-5 py-4">
              <div>
                <p className="text-sm font-bold">{p.activity?.title}</p>
                <p className="mt-0.5 font-mono text-xs text-ink/50">{p.booking_code}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusPill status={p.status} />
                <Link href={`/booking/${p.booking_code}`} className="text-sm font-bold text-coral-dark underline underline-offset-4">
                  Ulas sekarang
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </WorkspaceShell>
  );
}

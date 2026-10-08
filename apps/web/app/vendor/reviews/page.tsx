"use client";

import { useQuery } from "@tanstack/react-query";
import { Star } from "@phosphor-icons/react";
import Link from "next/link";
import {
  Metric,
  WorkspaceHeader,
  WorkspaceShell,
} from "../../components/workspace-shell";
import { useAuth } from "../../components/providers";
import { api } from "../../lib/api";

interface Review {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  status: string;
  activity?: { title: string; slug: string } | null;
  user?: { full_name: string } | null;
  booking?: { booking_code: string; status: string } | null;
}

export default function VendorReviewsPage() {
  const { authenticated, token } = useAuth();
  const query = useQuery({
    queryKey: ["vendor-reviews"],
    queryFn: () =>
      api.get<{
        reviews: Review[];
        summary: { average: number; count: number };
      }>("/vendor/reviews", token),
    enabled: Boolean(authenticated),
  });
  const rows = query.data?.reviews ?? [];
  const summary = query.data?.summary;

  return (
    <WorkspaceShell role="vendor" current="/vendor/reviews">
      <WorkspaceHeader
        eyebrow="Ulasan"
        title="Kata mereka."
        description="Lihat ulasan dari peserta yang telah menyelesaikan aktivitas Anda. Balas ulasan melalui detail pemesanan."
      />
      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        <Metric
          label="Rating rata-rata"
          value={query.isLoading ? "…" : String(summary?.average ?? 0)}
          hint={`${summary?.count ?? 0} ulasan dipublikasikan`}
        />
        <Metric
          label="Total ulasan"
          value={query.isLoading ? "…" : String(rows.length)}
          hint="semua status"
        />
        <Metric
          label="Bintang 5"
          value={
            query.isLoading
              ? "…"
              : String(rows.filter((r) => r.rating === 5).length)
          }
          hint="promotor"
        />
      </div>
      {query.isLoading ? (
        <div
          className="mt-8 space-y-3"
          aria-busy="true"
          aria-label="Memuat ulasan"
        >
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-[12px] bg-paper"
            />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-8 rounded-[12px] border border-dashed border-line bg-paper px-5 py-10 text-center text-sm text-ink/55">
          Belum ada ulasan. Ulasan muncul setelah trip COMPLETED.
        </p>
      ) : (
        <div className="mt-8 space-y-3">
          {rows.map((r) => (
            <article
              key={r.id}
              className="rounded-[12px] border border-line bg-paper px-5 py-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-sm font-bold">
                  <Star size={15} weight="fill" className="text-coral-dark" />{" "}
                  {r.rating}/5 · {r.user?.full_name ?? "-"}
                </p>
                <span className="font-mono text-[11px] text-ink/45">
                  {r.booking?.booking_code ?? ""}
                </span>
              </div>
              {r.activity && (
                <Link
                  href={`/activities/${r.activity.slug}`}
                  className="mt-1 inline-block text-xs font-bold text-coral-dark underline underline-offset-4"
                >
                  {r.activity.title}
                </Link>
              )}
              {r.title && <h2 className="mt-2 font-bold">{r.title}</h2>}
              <p className="mt-1 text-sm leading-6 text-ink/60">{r.body}</p>
            </article>
          ))}
        </div>
      )}
    </WorkspaceShell>
  );
}

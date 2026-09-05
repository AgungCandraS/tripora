"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Star } from "@phosphor-icons/react";
import { StatusPill, WorkspaceHeader, WorkspaceShell } from "../../components/workspace-shell";
import { useAuth } from "../../components/providers";
import { ApiError, api } from "../../lib/api";

interface Review {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  status: string;
  activity?: { title: string; slug: string; vendor?: { name: string } } | null;
  user?: { full_name: string; email: string } | null;
}

const FILTERS = ["Semua", "PUBLISHED", "PENDING", "HIDDEN"] as const;

export default function AdminReviewsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Semua");
  const [error, setError] = useState("");

  const query = useQuery({
    queryKey: ["admin-reviews", filter],
    queryFn: () =>
      api.get<Review[]>(filter === "Semua" ? "/admin/reviews" : `/admin/reviews?status=${filter}`, token),
    enabled: Boolean(token),
  });
  const rows = query.data ?? [];

  async function moderate(id: string, status: "PUBLISHED" | "HIDDEN") {
    setError("");
    try {
      await api.patch(`/admin/reviews/${id}`, { status }, token);
      await queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Gagal memoderasi.");
    }
  }

  return (
    <WorkspaceShell role="admin" current="/admin/reviews">
      <WorkspaceHeader
        eyebrow="Moderasi ulasan"
        title="Jaga kepercayaan."
        description="Sembunyikan ulasan bermasalah atau publikasikan ulang. Rating activity dihitung ulang otomatis."
      />
      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filter status">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`rounded-full px-4 py-2 text-xs font-bold transition ${filter === f ? "bg-ink text-paper" : "border border-line hover:border-ink/40"}`}
          >
            {f}
          </button>
        ))}
      </div>
      {error && <p className="mt-4 rounded-[10px] bg-[#f6d9c8] px-4 py-3 text-sm font-semibold text-[#8a3a20]" role="alert">{error}</p>}
      <div className="mt-5 space-y-3">
        {rows.map((r) => (
          <article key={r.id} className="rounded-[12px] border border-line bg-paper px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-sm font-bold">
                <Star size={15} weight="fill" className="text-coral-dark" /> {r.rating}/5 · {r.user?.full_name ?? "-"}
              </p>
              <StatusPill status={r.status} />
            </div>
            <p className="mt-1 text-xs text-ink/50">{r.activity?.vendor?.name ?? ""} · {r.activity?.title ?? ""}</p>
            {r.title && <h2 className="mt-2 font-bold">{r.title}</h2>}
            <p className="mt-1 text-sm leading-6 text-ink/60">{r.body}</p>
            <div className="mt-3 flex gap-3">
              {r.status !== "HIDDEN" ? (
                <button type="button" onClick={() => moderate(r.id, "HIDDEN")} className="text-xs font-bold text-coral-dark underline underline-offset-4">
                  Sembunyikan
                </button>
              ) : (
                <button type="button" onClick={() => moderate(r.id, "PUBLISHED")} className="text-xs font-bold text-moss underline underline-offset-4">
                  Publikasikan
                </button>
              )}
            </div>
          </article>
        ))}
        {!query.isLoading && rows.length === 0 && (
          <p className="rounded-[12px] border border-dashed border-line bg-paper px-5 py-10 text-center text-sm text-ink/55">
            Tidak ada ulasan pada filter ini.
          </p>
        )}
      </div>
    </WorkspaceShell>
  );
}

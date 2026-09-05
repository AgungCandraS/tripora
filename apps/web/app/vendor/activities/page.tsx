"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { StatusPill, WorkspaceHeader, WorkspaceShell } from "../../components/workspace-shell";
import { useAuth } from "../../components/providers";
import { api, formatIDR } from "../../lib/api";
import type { ApiActivity } from "../../lib/types";
import { minPrice } from "../../lib/types";

export default function VendorActivitiesPage() {
  const { token } = useAuth();
  const query = useQuery({
    queryKey: ["vendor-activities"],
    queryFn: () => api.get<ApiActivity[]>("/vendor/activities", token),
    enabled: Boolean(token),
  });
  const rows = query.data ?? [];

  return (
    <WorkspaceShell role="vendor" current="/vendor/activities">
      <WorkspaceHeader eyebrow="Listings" title="Kelola aktivitas." description="Sumber data: backend. Draft → submit → moderasi admin → Published." />
      <div className="mt-7 flex flex-wrap justify-end gap-2">
        <Link href="/vendor/activities/new" className="rounded-[10px] bg-ink px-4 py-3 text-sm font-bold text-paper">Tambah aktivitas</Link>
        <Link href="/vendor/onboarding" className="rounded-[10px] border border-line px-4 py-3 text-sm font-bold">Onboarding</Link>
      </div>
      {query.isLoading ? (
        <div className="mt-4 space-y-3" aria-busy="true" aria-label="Memuat aktivitas">
          {[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-[12px] bg-paper" />)}
        </div>
      ) : query.isError ? (
        <p className="mt-4 rounded-[12px] border border-line bg-paper px-5 py-8 text-center text-sm text-ink/55">
          Gagal memuat. <button type="button" onClick={() => query.refetch()} className="font-bold text-coral-dark underline underline-offset-4">Coba lagi</button>
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-4 rounded-[12px] border border-dashed border-line bg-paper px-5 py-10 text-center text-sm text-ink/55">
          Belum ada activity. Buat yang pertama lewat tombol di atas.
        </p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-[12px] border border-line bg-paper">
          <div className="hidden grid-cols-[1.4fr_0.7fr_0.55fr_0.55fr] gap-4 border-b border-line px-5 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-ink/45 sm:grid">
            <span>Aktivitas</span><span>Status</span><span>Harga</span><span />
          </div>
          {rows.map((activity) => (
            <div key={activity.id} className="grid gap-2 border-b border-line px-5 py-4 last:border-0 sm:grid-cols-[1.4fr_0.7fr_0.55fr_0.55fr] sm:items-center sm:gap-4">
              <div>
                <p className="text-sm font-bold">{activity.title}</p>
                <p className="mt-1 text-xs text-ink/50">{activity.destination?.name ?? "-"} · {(activity.packages ?? []).length} paket</p>
              </div>
              <StatusPill status={activity.status} />
              <span className="text-sm font-semibold">{formatIDR(minPrice(activity))}</span>
              <span className="flex gap-3">
                <Link href={`/vendor/activities/${activity.id}`} className="text-sm font-bold text-ink underline underline-offset-4">Edit</Link>
                <Link href={`/activities/${activity.slug}`} className="text-sm font-bold text-coral-dark underline underline-offset-4">Preview</Link>
              </span>
            </div>
          ))}
        </div>
      )}
    </WorkspaceShell>
  );
}

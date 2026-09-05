"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Check, X } from "@phosphor-icons/react";
import { StatusPill, WorkspaceHeader, WorkspaceShell } from "../../components/workspace-shell";
import { useAuth } from "../../components/providers";
import { ApiError, api } from "../../lib/api";

interface Item {
  id: string;
  title: string;
  slug: string;
  status: string;
  vendor?: { name: string };
  destination?: { name: string };
}

export default function AdminListingsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");

  const query = useQuery({
    queryKey: ["admin-listings"],
    queryFn: () => api.get<Item[]>("/admin/activities", token),
    enabled: Boolean(token),
  });
  const items = query.data ?? [];
  const queue = items.filter((i) => i.status === "IN_REVIEW").length;

  async function decide(id: string, action: "approve" | "reject" | "suspend") {
    setError("");
    try {
      await api.post(`/admin/activities/${id}/${action}`, {}, token);
      await queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Aksi gagal.");
    }
  }

  return (
    <WorkspaceShell role="admin" current="/admin/listings">
      <WorkspaceHeader
        eyebrow="Listing moderation"
        title="Moderasi listing."
        description={`${queue} listing menunggu. Approve menerbitkan ke storefront.`} />
      {error && <p className="mt-4 rounded-[10px] bg-[#f6d9c8] px-4 py-3 text-sm font-semibold text-[#8a3a20]" role="alert">{error}</p>}
      {query.isLoading ? (
        <div className="mt-8 space-y-3" aria-busy="true" aria-label="Memuat listing">
          {[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-[12px] bg-paper" />)}
        </div>
      ) : items.length === 0 ? (
        <p className="mt-8 rounded-[12px] border border-dashed border-line bg-paper px-5 py-10 text-center text-sm text-ink/55">
          Belum ada listing masuk.
        </p>
      ) : (
        <div className="mt-8 space-y-3">
          {items.map((it) => (
            <article key={it.id} className="flex flex-wrap items-center justify-between gap-4 rounded-[12px] border border-line bg-paper px-5 py-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="font-bold">{it.title}</h2>
                  <StatusPill status={it.status} />
                </div>
                <p className="mt-1 text-xs text-ink/50">{it.vendor?.name} · {it.destination?.name}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {it.status === "PUBLISHED" && (
                  <Link href={`/activities/${it.slug}`} className="rounded-[10px] border border-line px-3.5 py-2.5 text-xs font-bold hover:border-ink/40">
                    Preview
                  </Link>
                )}
                {(it.status === "IN_REVIEW" || it.status === "DRAFT") && (
                  <>
                    <button type="button" onClick={() => decide(it.id, "approve")} className="inline-flex items-center gap-1.5 rounded-[10px] bg-moss px-3.5 py-2.5 text-xs font-bold text-paper">
                      <Check size={14} weight="bold" /> Approve
                    </button>
                    <button type="button" onClick={() => decide(it.id, "reject")} className="inline-flex items-center gap-1.5 rounded-[10px] border border-line px-3.5 py-2.5 text-xs font-bold hover:border-ink/40">
                      <X size={14} weight="bold" /> Reject
                    </button>
                  </>
                )}
                {it.status === "PUBLISHED" && (
                  <button type="button" onClick={() => decide(it.id, "suspend")} className="rounded-[10px] border border-line px-3.5 py-2.5 text-xs font-bold hover:border-ink/40">
                    Suspend
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </WorkspaceShell>
  );
}

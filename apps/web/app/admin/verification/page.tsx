"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check } from "@phosphor-icons/react";
import Link from "next/link";
import {
  Metric,
  StatusPill,
  WorkspaceHeader,
  WorkspaceShell,
} from "../../components/workspace-shell";
import { useAuth } from "../../components/providers";
import { ApiError, api } from "../../lib/api";

interface Vendor {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
  owner?: { full_name: string; email: string } | null;
  documents?: Array<{ id: string; type: string; verification_status: string }>;
}

export default function AdminVerificationPage() {
  const { authenticated, token } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");

  const query = useQuery({
    queryKey: ["admin-verification"],
    queryFn: () => api.get<Vendor[]>("/admin/vendors", token),
    enabled: Boolean(authenticated),
  });
  const queue = (query.data ?? []).filter((v) => v.status === "PENDING");
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-verification"] });

  async function act(id: string, action: "approve" | "reject") {
    setError("");
    try {
      await api.post(`/admin/vendors/${id}/${action}`, {}, token);
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Aksi gagal.");
    }
  }

  return (
    <WorkspaceShell role="admin" current="/admin/verification">
      <WorkspaceHeader
        eyebrow="Vendor verification"
        title="Antrean verifikasi."
        description="Periksa dokumen dan kelayakan mitra sebelum menyetujui pendaftaran. Riwayat keputusan tersedia pada detail mitra."
      />
      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        <Metric
          label="Menunggu verifikasi"
          value={query.isLoading ? "…" : String(queue.length)}
          hint="butuh keputusan"
        />
        <Metric
          label="Total vendor"
          value={query.isLoading ? "…" : String(query.data?.length ?? 0)}
          hint="semua status"
        />
      </div>
      {error && (
        <p
          className="mt-4 rounded-[10px] bg-[#f6d9c8] px-4 py-3 text-sm font-semibold text-[#8a3a20]"
          role="alert"
        >
          {error}
        </p>
      )}
      {query.isLoading ? (
        <div
          className="mt-8 space-y-3"
          aria-busy="true"
          aria-label="Memuat antrean"
        >
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-[12px] bg-paper"
            />
          ))}
        </div>
      ) : queue.length === 0 ? (
        <p className="mt-8 rounded-[12px] border border-dashed border-line bg-paper px-5 py-10 text-center text-sm text-ink/55">
          Antrean kosong. Lihat semua vendor di{" "}
          <Link
            href="/admin/vendors"
            className="font-bold text-coral-dark underline underline-offset-4"
          >
            halaman Vendor
          </Link>
          .
        </p>
      ) : (
        <div className="mt-8 space-y-3">
          {queue.map((v) => (
            <article
              key={v.id}
              className="rounded-[12px] border border-line bg-paper px-5 py-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="font-bold">{v.name}</h2>
                    <StatusPill status={v.status} />
                  </div>
                  <p className="mt-1 text-xs text-ink/50">
                    {v.owner?.full_name ?? "-"} · {v.owner?.email ?? "-"} ·{" "}
                    {v.documents?.length ?? 0} dokumen
                    {v.documents && v.documents.length > 0 && (
                      <span>
                        {" "}
                        (
                        {v.documents
                          .map((d) => `${d.type}:${d.verification_status}`)
                          .join(", ")}
                        )
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => act(v.id, "approve")}
                    className="inline-flex items-center gap-1.5 rounded-[10px] bg-moss px-3.5 py-2.5 text-xs font-bold text-paper"
                  >
                    <Check size={14} weight="bold" /> Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => act(v.id, "reject")}
                    className="rounded-[10px] border border-line px-3.5 py-2.5 text-xs font-bold hover:border-ink/40"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </WorkspaceShell>
  );
}

"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Pause, PencilSimple } from "@phosphor-icons/react";
import {
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
  commission_rate_default: number | string;
  created_at: string;
  owner?: { full_name: string; email: string } | null;
  documents?: Array<{ id: string }>;
}

function rateOf(v: Vendor): number {
  return typeof v.commission_rate_default === "string"
    ? Number(v.commission_rate_default)
    : v.commission_rate_default;
}

export default function AdminVendorsPage() {
  const { authenticated, token } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");

  const query = useQuery({
    queryKey: ["admin-vendors"],
    queryFn: () => api.get<Vendor[]>("/admin/vendors", token),
    enabled: Boolean(authenticated),
  });
  const vendors = query.data ?? [];
  const queue = vendors.filter((v) => v.status === "PENDING").length;
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-vendors"] });

  async function act(
    id: string,
    action: "approve" | "reject" | "suspend" | "reactivate",
  ) {
    setError("");
    try {
      if (action === "reactivate") {
        await api.post(`/admin/vendors/${id}/approve`, {}, token);
      } else {
        await api.post(`/admin/vendors/${id}/${action}`, {}, token);
      }
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Aksi gagal.");
    }
  }

  return (
    <WorkspaceShell role="admin" current="/admin/vendors">
      <WorkspaceHeader
        eyebrow="Vendor management"
        title="Verifikasi dan kelola vendor."
        description={`${queue} menunggu verifikasi. Approve, suspend, dan atur komisi — semua tercatat di audit log.`}
      />
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
          aria-label="Memuat vendor"
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-[12px] bg-paper"
            />
          ))}
        </div>
      ) : vendors.length === 0 ? (
        <p className="mt-8 rounded-[12px] border border-dashed border-line bg-paper px-5 py-10 text-center text-sm text-ink/55">
          Belum ada vendor terdaftar.
        </p>
      ) : (
        <div className="mt-8 space-y-3">
          {vendors.map((vendor) => (
            <article
              key={vendor.id}
              className="rounded-[12px] border border-line bg-paper px-5 py-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="font-bold">{vendor.name}</h2>
                    <StatusPill status={vendor.status} />
                  </div>
                  <p className="mt-1 text-xs text-ink/50">
                    {vendor.owner?.full_name ?? "-"} ·{" "}
                    {vendor.documents?.length ?? 0} dokumen · komisi{" "}
                    {(rateOf(vendor) * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {vendor.status === "PENDING" && (
                    <>
                      <button
                        type="button"
                        onClick={() => act(vendor.id, "approve")}
                        className="inline-flex items-center gap-1.5 rounded-[10px] bg-moss px-3.5 py-2.5 text-xs font-bold text-paper"
                      >
                        <Check size={14} weight="bold" /> Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => act(vendor.id, "reject")}
                        className="rounded-[10px] border border-line px-3.5 py-2.5 text-xs font-bold hover:border-ink/40"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {vendor.status === "APPROVED" && (
                    <button
                      type="button"
                      onClick={() => act(vendor.id, "suspend")}
                      className="inline-flex items-center gap-1.5 rounded-[10px] border border-line px-3.5 py-2.5 text-xs font-bold hover:border-ink/40"
                    >
                      <Pause size={14} weight="bold" /> Suspend
                    </button>
                  )}
                  {(vendor.status === "SUSPENDED" ||
                    vendor.status === "REJECTED") && (
                    <button
                      type="button"
                      onClick={() => act(vendor.id, "reactivate")}
                      className="inline-flex items-center gap-1.5 rounded-[10px] bg-ink px-3.5 py-2.5 text-xs font-bold text-paper"
                    >
                      <Check size={14} weight="bold" /> Aktifkan lagi
                    </button>
                  )}
                  <button
                    type="button"
                    aria-expanded={editing === vendor.id}
                    onClick={() =>
                      setEditing((e) => (e === vendor.id ? null : vendor.id))
                    }
                    className="inline-flex items-center gap-1.5 rounded-[10px] border border-line px-3.5 py-2.5 text-xs font-bold hover:border-ink/40"
                  >
                    <PencilSimple size={14} /> Komisi
                  </button>
                </div>
              </div>
              {editing === vendor.id && (
                <form
                  className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const value =
                      Number(new FormData(e.currentTarget).get("commission")) /
                      100;
                    try {
                      await api.patch(
                        `/admin/vendors/${vendor.id}/commission`,
                        { rate: value },
                        token,
                      );
                      setEditing(null);
                      await refresh();
                    } catch (err) {
                      setError(
                        err instanceof ApiError
                          ? err.message
                          : "Gagal menyimpan komisi.",
                      );
                    }
                  }}
                >
                  <label className="flex items-center gap-2 text-xs font-bold">
                    Komisi baru (%)
                    <input
                      name="commission"
                      type="number"
                      min={0}
                      max={30}
                      step={0.1}
                      defaultValue={(rateOf(vendor) * 100).toFixed(1)}
                      className="w-20 rounded-[8px] border border-line bg-transparent px-2.5 py-2 font-mono text-sm outline-none focus:border-coral-dark"
                    />
                  </label>
                  <button
                    type="submit"
                    className="rounded-[8px] bg-ink px-3.5 py-2 text-xs font-bold text-paper"
                  >
                    Simpan
                  </button>
                  <span className="text-[11px] text-ink/45">
                    Hanya untuk transaksi baru — histori tidak berubah.
                  </span>
                </form>
              )}
            </article>
          ))}
        </div>
      )}
    </WorkspaceShell>
  );
}

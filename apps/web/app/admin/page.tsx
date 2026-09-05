"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Metric, WorkspaceHeader, WorkspaceShell } from "../components/workspace-shell";
import { useAuth } from "../components/providers";
import { api, formatIDR } from "../lib/api";

export default function AdminPage() {
  const { token } = useAuth();
  const dash = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => api.get<{ bookings: number; vendors: number; activities: number; gross: number }>("/admin/dashboard", token),
    enabled: Boolean(token),
  });
  const vendors = useQuery({
    queryKey: ["admin-vendors"],
    queryFn: () => api.get<Array<{ status: string }>>("/admin/vendors", token),
    enabled: Boolean(token),
  });
  const listings = useQuery({
    queryKey: ["admin-listings"],
    queryFn: () => api.get<Array<{ status: string }>>("/admin/activities", token),
    enabled: Boolean(token),
  });
  const refunds = useQuery({
    queryKey: ["admin-refunds"],
    queryFn: () => api.get<Array<{ status: string }>>("/refunds", token),
    enabled: Boolean(token),
  });

  const o = dash.data;
  const pendingVendors = (vendors.data ?? []).filter((v) => v.status === "PENDING").length;
  const pendingListings = (listings.data ?? []).filter((a) => a.status === "IN_REVIEW").length;
  const pendingRefunds = (refunds.data ?? []).filter((r) => r.status === "PENDING").length;
  const loading = dash.isLoading;

  return (
    <WorkspaceShell role="admin" current="/admin">
      <WorkspaceHeader eyebrow="Platform admin" title="Jaga marketplace tetap sehat." description="Ringkasan live dari database." />
      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Vendor" value={loading ? "…" : String(o?.vendors ?? 0)} hint={`${pendingVendors} menunggu verifikasi`} />
        <Metric label="Listing" value={loading ? "…" : String(o?.activities ?? 0)} hint={`${pendingListings} perlu moderasi`} />
        <Metric label="Booking" value={loading ? "…" : String(o?.bookings ?? 0)} hint={o ? `${formatIDR(o.gross)} gross` : ""} />
        <Metric label="Refund pending" value={refunds.isLoading ? "…" : String(pendingRefunds)} hint="Perlu tindakan" />
      </div>
      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        <section className="rounded-[14px] border border-line bg-paper p-5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-coral-dark">Needs attention</p>
              <h2 className="mt-2 text-xl font-bold">Antrian moderasi</h2>
            </div>
            <Link href="/admin/vendors" className="text-sm font-semibold text-ink/60 underline underline-offset-4">Buka semua</Link>
          </div>
          <div className="mt-5 space-y-3">
            <Link href="/admin/vendors" className="block rounded-[10px] bg-soft px-4 py-3 text-sm font-semibold hover:bg-sage">{pendingVendors} vendor menunggu verifikasi</Link>
            <Link href="/admin/listings" className="block rounded-[10px] bg-soft px-4 py-3 text-sm font-semibold hover:bg-sage">{pendingListings} listing perlu ditinjau</Link>
            <Link href="/admin/refunds" className="block rounded-[10px] bg-soft px-4 py-3 text-sm font-semibold hover:bg-sage">{pendingRefunds} refund menunggu keputusan</Link>
          </div>
        </section>
        <section className="rounded-[14px] bg-ink p-5 text-paper">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-coral">Aksi cepat</p>
          <h2 className="mt-2 text-xl font-bold">Kelola platform.</h2>
          <div className="mt-6 grid grid-cols-2 gap-3 text-sm font-bold">
            {[
              ["/admin/bookings", "Booking"],
              ["/admin/transactions", "Transaksi"],
              ["/admin/payouts", "Payout"],
              ["/admin/promos", "Promo"],
              ["/admin/users", "Users"],
              ["/admin/cms", "CMS"],
            ].map(([href, label]) => (
              <Link key={href} href={href} className="rounded-[10px] bg-paper/10 px-4 py-3.5 text-center transition hover:bg-paper/20">
                {label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}

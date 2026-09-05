"use client";

import Link from "next/link";
import { WorkspaceHeader, WorkspaceShell } from "../../components/workspace-shell";

const ITEMS = [
  { t: "Vendor verification", d: "/admin/vendors: antrean PENDING, Approve / Reject / Suspend / Aktifkan lagi. Atur komisi per vendor (0–30%, hanya untuk transaksi baru — histori snapshot tidak berubah). Semua aksi tercatat di audit log." },
  { t: "Listing moderation", d: "/admin/listings: Draft / IN_REVIEW / PUBLISHED. Setujui listing yang memenuhi standar (judul, deskripsi, harga IDR, kapasitas, meeting point) sebelum tampil di Explore." },
  { t: "Booking & transaksi", d: "/admin/bookings memantau semua status (PENDING_PAYMENT → COMPLETED + CANCELLED/EXPIRED/REFUNDED). /admin/transactions + /api/docs memantau payment Mayar: PENDING → PAID via webhook terverifikasi idempoten." },
  { t: "Refund & payout", d: "/admin/refunds: full/partial sesuai kebijakan vendor (>7 hari 100%, 3–7 hari 50%, <3 hari non-refundable) + audit trail. /admin/payouts: proses settlement vendor (net = total − komisi − refund)." },
  { t: "Promo, CMS, reports", d: "/admin/promos (cth. PAGI10, FAMILY15), /admin/cms (konten landing SEO /destinations/*, /categories/*), /admin/reports (gross, booking, vendor, aktivitas)." },
  { t: "Users, audit & settings", d: "/admin/users (role CUSTOMER/VENDOR_OWNER/VENDOR_STAFF/ADMIN — undang = user daftar di /auth/register lalu admin atur role). /admin/audit untuk jejak aksi kritis. /admin/settings untuk konfigurasi platform." },
];

export default function AdminBantuanPage() {
  return (
    <WorkspaceShell role="admin" current="/admin/bantuan">
      <WorkspaceHeader
        eyebrow="Bantuan admin"
        title="Jaga marketplace sehat."
        description="Satu-satunya halaman bantuan admin — sesuai alur PRD §17."
     />
      <div className="mt-7 space-y-3">
        {ITEMS.map((s) => (
          <article key={s.t} className="rounded-[12px] border border-line bg-paper p-5">
            <h2 className="font-bold">{s.t}</h2>
            <p className="mt-1.5 text-sm leading-6 text-ink/60">{s.d}</p>
          </article>
        ))}
      </div>
      <div className="mt-5 rounded-[12px] bg-ink p-5 text-sm leading-6 text-paper/70">
        API docs: <Link href="http://localhost:4000/api/docs" className="font-bold text-coral underline underline-offset-4">/api/docs</Link>
        {" · "}Audit: <Link href="/admin/audit" className="font-bold text-coral underline underline-offset-4">Audit log</Link>
      </div>
    </WorkspaceShell>
  );
}

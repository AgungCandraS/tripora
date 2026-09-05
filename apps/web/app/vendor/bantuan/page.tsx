"use client";

import Link from "next/link";
import { WorkspaceHeader, WorkspaceShell } from "../../components/workspace-shell";

const ITEMS = [
  { t: "1. Onboarding & verifikasi", d: "Daftar di /vendor/onboarding: info bisnis + dokumen. Status PENDING → admin approve/reject di /admin/vendors. APPROVED membuka semua menu operasional." },
  { t: "2. Activity → Package → Schedule", d: "Buat activity (judul, slug, deskripsi, destinasi, kategori, min. usia), tambah package (nama, harga IDR integer, durasi, min/max peserta), lalu atur schedule per hari (jam mulai–selesai, kapasitas). Semua tersimpan di PostgreSQL." },
  { t: "3. Listing & moderasi", d: "Draft → submit → moderasi admin (/admin/listings) → PUBLISHED. Preview publik di /activities/[slug]. Draft tidak tampil di Explore." },
  { t: "4. Booking masuk (terisolasi)", d: "/vendor/bookings hanya menampilkan vendor_id milikmu (Vendor A tidak bisa melihat Vendor B). Filter: PENDING_PAYMENT, PAID, CONFIRMED, CHECKED_IN, COMPLETED, CANCELLED." },
  { t: "5. QR check-in", d: "/vendor/check-in memverifikasi signed ticket token (signature + status + kepemilikan vendor). Scan ganda = TICKET_ALREADY_USED. Setiap scan tercatat untuk audit." },
  { t: "6. Revenue, komisi & payout", d: "Komisi default 10% (snapshot per transaksi di bookings + vendor_earnings — histori tidak berubah saat rate diubah). Lihat ringkasan di /vendor/revenue, ajukan/lacak pencairan di /vendor/payouts." },
  { t: "7. Staff & promo", d: "Undang staff di /vendor/staff dengan permission granular (bookings.view, schedule.view, ticket.scan, checkin). Kelola kode promo (cth. PAGI10) di /vendor/promos — validasi final oleh backend saat booking." },
];

export default function VendorBantuanPage() {
  return (
    <WorkspaceShell role="vendor" current="/vendor/bantuan">
      <WorkspaceHeader
        eyebrow="Bantuan vendor"
        title="Jualan sampai payout."
        description="Satu-satunya halaman bantuan vendor — urutan operasional sesuai PRD §16."
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
        Kemitraan & kendala: <a href="mailto:partner@tripora.id" className="font-bold text-coral underline underline-offset-4">partner@tripora.id</a>
        {" · "}Mulai: <Link href="/vendor/onboarding" className="font-bold text-coral underline underline-offset-4">Onboarding</Link>
      </div>
    </WorkspaceShell>
  );
}

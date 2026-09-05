"use client";

import Link from "next/link";
import { WorkspaceHeader, WorkspaceShell } from "../../components/workspace-shell";

const ITEMS = [
  { t: "My Trips & histori", d: "Semua booking dari akunmu tampil di /account/trips dengan kode TRP-, tanggal, slot, dan status live. Booking guest (tanpa login) dilacak via /my-trips memakai kode + email/WhatsApp pemesan." },
  { t: "Detail & e-ticket", d: "Buka /booking/[code] untuk timeline PENDING_PAYMENT → CONFIRMED, rincian subtotal / diskon / biaya layanan / total, tombol cetak, dan QR signed ticket token." },
  { t: "Wishlist", d: "/account/wishlist menyimpan aktivitas yang ingin dicoba — sinkron di semua perangkat selama login." },
  { t: "Review terverifikasi", d: "Review hanya terbuka setelah status COMPLETED dan harus login sebagai pemilik booking. Rating 1–5 + cerita. Ulasan tersimpan tidak bisa diduplikasi." },
  { t: "Profil & keamanan", d: "Kelola nama, email, WhatsApp di /account. Password minimal 8 karakter. Keluar dari perangkat bersama via tombol Keluar di sidebar." },
];

export default function CustomerBantuanPage() {
  return (
    <WorkspaceShell role="customer" current="/account/bantuan">
      <WorkspaceHeader
        eyebrow="Bantuan customer"
        title="Akun, trip & tiket."
        description="Satu-satunya halaman bantuan customer — tidak ada AI generik, semua sesuai alur Tripora."
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
        Butuh bantuan manusia? <a href="mailto:halo@tripora.id" className="font-bold text-coral underline underline-offset-4">halo@tripora.id</a>
        {" · "}Lacak booking guest: <Link href="/my-trips" className="font-bold text-coral underline underline-offset-4">My Trips lookup</Link>
      </div>
    </WorkspaceShell>
  );
}

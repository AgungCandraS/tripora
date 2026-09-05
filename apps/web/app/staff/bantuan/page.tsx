"use client";

import Link from "next/link";
import { WorkspaceHeader, WorkspaceShell } from "../../components/workspace-shell";

const ITEMS = [
  { t: "Jadwal hari ini", d: "/staff menampilkan keberangkatan hari ini (tanggal Asia/Jakarta) diurutkan jam slot: slot, aktivitas, nama pemesan, jumlah pax, dan status. Counter selesai/total + progress bar terupdate otomatis." },
  { t: "Scan tiket", d: "/staff/check-in: tempel token QR ke kolom verifikasi (dioptimalkan satu tangan + kamera HP). Server memverifikasi signature, status tiket/booking, dan kepemilikan vendor." },
  { t: "Kode hasil scan", d: "Sukses = bookingCode valid + status. TICKET_ALREADY_USED = tiket sudah dipakai (tolak masuk ganda). NOT_FOUND / FORBIDDEN = token salah atau bukan vendor-mu." },
  { t: "Verifikasi peserta", d: "/staff/verify + /staff/bookings untuk cek nama peserta, usia, kontak darurat, dan kebutuhan khusus sebelum berangkat." },
  { t: "Batasan permission", d: "Staff hanya: bookings, daily schedule, ticket scanning, check-in, participant verification. Revenue, payout, promo, dan pengaturan hanya untuk VENDOR_OWNER." },
];

export default function StaffBantuanPage() {
  return (
    <WorkspaceShell role="staff" current="/staff/bantuan">
      <WorkspaceHeader
        eyebrow="Bantuan staff"
        title="Check-in tanpa antre."
        description="Satu-satunya halaman bantuan staff lapangan — fokus scan & verifikasi."
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
        Buka scanner: <Link href="/staff/check-in" className="font-bold text-coral underline underline-offset-4">Scan tiket</Link>
        {" · "}Jadwal: <Link href="/staff" className="font-bold text-coral underline underline-offset-4">Hari ini</Link>
      </div>
    </WorkspaceShell>
  );
}

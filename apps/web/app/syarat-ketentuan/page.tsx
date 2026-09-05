import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "../components/site-header";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan | Tripora",
  description: "Syarat & ketentuan penggunaan marketplace booking wisata Tripora.",
};

const SECTIONS = [
  {
    t: "1. Layanan Tripora",
    d: "Tripora adalah marketplace yang mempertemukan customer dengan vendor aktivitas wisata di Bandung Raya. Tripora memfasilitasi discovery, reservation hold 10 menit, pembayaran online via Mayar, penerbitan QR e-ticket, dan check-in — pelaksanaan aktivitas sepenuhnya tanggung jawab vendor penyelenggara.",
  },
  {
    t: "2. Akun",
    d: "Booking dapat dilakukan sebagai guest tanpa akun (cukup nama, email, WhatsApp). Akun terdaftar wajib menjaga kerahasiaan password; ganti password memutus semua sesi lain. Satu orang dilarang memiliki banyak akun untuk menyalahgunakan promo.",
  },
  {
    t: "3. Booking & pembayaran",
    d: "Harga final, diskon, dan availability ditentukan backend — bukan frontend. Slot yang habis menolak dengan SLOT_NOT_AVAILABLE. Pembayaran hanya sah setelah webhook Mayar terverifikasi server; bukti transfer manual atau tangkapan layar bukan bukti bayar. Batas unpaid: 3 booking aktif per kontak.",
  },
  {
    t: "4. E-ticket & check-in",
    d: "QR berisi signed ticket token satu kali pakai. Scan ganda ditolak (TICKET_ALREADY_USED). Pengunjung wajib datang sesuai tanggal dan slot; keterlambatan mengikuti kebijakan vendor masing-masing.",
  },
  {
    t: "5. Pembatalan & refund",
    d: "Mengikuti kebijakan refund yang berlaku (detail di Kebijakan Refund). Dana yang memenuhi syarat dikembalikan via alur refund beraudit; biaya layanan platform tidak dikembalikan untuk pembatalan parsial sesuai porsi yang berlaku.",
  },
  {
    t: "6. Konten & ulasan",
    d: "Ulasan hanya dari booking COMPLETED yang terverifikasi. Dilarang mengunggah konten SARA, pornografi, spam, atau ulasan palsu — pelanggar dapat disembunyikan admin dan akunnya disuspend.",
  },
  {
    t: "7. Batasan tanggung jawab",
    d: "Risiko aktivitas fisik (rafting, ATV, trekking, camping) ditanggung peserta sesuai briefing dan perlengkapan vendor. Tripora tidak bertanggung jawab atas force majeure, cuaca, atau perubahan jadwal operasional vendor — booking terdampak mendapat full refund atau reschedule yang disetujui.",
  },
  {
    t: "8. Perubahan & kontak",
    d: "Syarat ini dapat diperbarui mengikuti PRD produk; versi berlaku adalah yang tampil di halaman ini. Pertanyaan: halo@tripora.id. Kemitraan vendor: partner@tripora.id.",
  },
];

export default function SyaratPage() {
  return (
    <main className="bg-paper text-ink">
      <SiteHeader />
      <section className="mx-auto max-w-[860px] px-5 pb-24 pt-14 sm:pt-20">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-coral-dark">Legal · berlaku sejak 2026</p>
        <h1 className="display-text mt-2 text-3xl font-bold tracking-[-0.045em] sm:text-5xl">Syarat & Ketentuan.</h1>
        <p className="mt-4 max-w-[640px] text-sm leading-6 text-ink/60">
          Aturan main memakai Tripora — untuk customer, vendor, dan staff. Lihat juga{" "}
          <Link href="/kebijakan-privasi" className="font-bold text-coral-dark underline underline-offset-4">Kebijakan Privasi</Link>{" "}
          dan <Link href="/kebijakan-refund" className="font-bold text-coral-dark underline underline-offset-4">Kebijakan Refund</Link>.
        </p>
        <div className="mt-10 space-y-3">
          {SECTIONS.map((s) => (
            <article key={s.t} className="rounded-[14px] border border-line bg-paper p-5 sm:p-6">
              <h2 className="text-lg font-bold">{s.t}</h2>
              <p className="mt-2 text-sm leading-7 text-ink/60">{s.d}</p>
            </article>
          ))}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

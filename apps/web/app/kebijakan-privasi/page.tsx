import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "../components/site-header";

export const metadata: Metadata = {
  title: "Kebijakan Privasi | Tripora",
  description: "Bagaimana Tripora mengumpulkan, memakai, dan melindungi data pribadi.",
};

const SECTIONS = [
  {
    t: "1. Data yang kami kumpulkan",
    d: "Identitas: nama lengkap, email, nomor WhatsApp. Booking: tanggal, slot, jumlah peserta, nama/usia peserta tambahan, kontak darurat, kebutuhan khusus. Teknis: sesi browser (tripora_session untuk mengikat reservation), log audit aksi kritis. Dokumen verifikasi vendor disimpan privat dan tidak tampil publik.",
  },
  {
    t: "2. Penggunaan data",
    d: "Memproses booking dan pembayaran Mayar (nama, email, dan telepon diteruskan ke Mayar untuk membuat invoice), menerbitkan e-ticket, check-in oleh vendor penyelenggara, notifikasi status booking, pencegahan booking fiktif (rate limit, deteksi duplikat), dan audit keamanan.",
  },
  {
    t: "3. Berbagi data",
    d: "Data booking dibagikan ke vendor penyelenggara aktivitasmu (untuk operasional dan check-in) dan ke Mayar (untuk pembayaran). Tidak dijual ke pihak ketiga. Penegak hukum hanya atas permintaan resmi yang sah.",
  },
  {
    t: "4. Penyimpanan & keamanan",
    d: "Password di-hash (bcrypt), token refresh dirotasi dan disimpan sebagai hash, QR tiket disimpan sebagai hash token. Log bebas PII sensitif. Akses vendor dibatasi vendor_id miliknya; staff hanya melihat data lapangan yang diizinkan permission.",
  },
  {
    t: "5. Hak kamu",
    d: "Melihat dan mengedit profil di halaman Profil, meminta koreksi data via halo@tripora.id, serta menghapus akun (riwayat finansial dan audit tetap disimpan sesuai kewajiban pencatatan, tanpa data yang bisa dihapus aman).",
  },
  {
    t: "6. Retensi",
    d: "Data booking, pembayaran, refund, payout, dan audit tidak dihapus sembarangan karena menjadi bukti transaksi. Data sesi kedaluwarsa dibersihkan otomatis oleh worker rekonsiliasi.",
  },
  {
    t: "7. Kontak",
    d: "Pertanyaan privasi: halo@tripora.id. Lihat juga Syarat & Ketentuan dan Kebijakan Refund.",
  },
];

export default function PrivasiPage() {
  return (
    <main className="bg-paper text-ink">
      <SiteHeader />
      <section className="mx-auto max-w-[860px] px-5 pb-24 pt-14 sm:pt-20">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-coral-dark">Legal · privasi data</p>
        <h1 className="display-text mt-2 text-3xl font-bold tracking-[-0.045em] sm:text-5xl">Kebijakan Privasi.</h1>
        <p className="mt-4 max-w-[640px] text-sm leading-6 text-ink/60">
          Data booking-mu dipakai untuk operasional perjalanan — bukan untuk dijual. Lihat juga{" "}
          <Link href="/syarat-ketentuan" className="font-bold text-coral-dark underline underline-offset-4">Syarat & Ketentuan</Link>.
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

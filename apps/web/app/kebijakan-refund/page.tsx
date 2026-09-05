import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "../components/site-header";

export const metadata: Metadata = {
  title: "Kebijakan Refund | Tripora",
  description: "Aturan pembatalan dan pengembalian dana booking Tripora.",
};

export default function RefundPage() {
  return (
    <main className="bg-paper text-ink">
      <SiteHeader />
      <section className="mx-auto max-w-[860px] px-5 pb-24 pt-14 sm:pt-20">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-coral-dark">Legal · refund beraudit</p>
        <h1 className="display-text mt-2 text-3xl font-bold tracking-[-0.045em] sm:text-5xl">Kebijakan Refund.</h1>
        <p className="mt-4 max-w-[640px] text-sm leading-6 text-ink/60">
          Persentase dihitung dari total booking dan di-snapshot saat transaksi — perubahan kebijakan tidak mengubah hak booking lama.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            { t: "> 7 hari", d: "100% kembali", note: "Sebelum tanggal aktivitas" },
            { t: "3–7 hari", d: "50% kembali", note: "Sebelum tanggal aktivitas" },
            { t: "< 3 hari", d: "Non-refundable", note: "Kecuali pembatalan vendor" },
          ].map((c) => (
            <div key={c.t} className="rounded-[14px] border border-line bg-paper p-5 text-center">
              <p className="font-mono text-sm font-bold text-coral-dark">{c.t}</p>
              <p className="mt-2 text-xl font-bold">{c.d}</p>
              <p className="mt-1 text-xs text-ink/50">{c.note}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-3">
          {[
            { t: "Cara mengajukan", d: "Customer: hubungi vendor/admin via email dengan kode booking TRP- dan alasan. Vendor mengajukan dari dashboard; admin memverifikasi kebijakan lalu approve/reject. Booking berstatus REFUND_PENDING selama diproses." },
            { t: "Pembatalan oleh vendor", d: "Cuaca, operasional, alat, peserta minimum, atau force majeure — wajib beralasan. Booking terdampak mendapat full refund atau reschedule yang disetujui ke slot valid (aktivitas & paket sama, harga sama)." },
            { t: "No-show", d: "Booking CONFIRMED yang slotnya lewat tanpa kehadiran menjadi NO_SHOW dan default tidak di-refund." },
            { t: "Penyaluran dana", d: "Refund yang disetujui diproses ke kanal pembayaran asal via gateway. Liabilitas vendor vs platform dicatat terpisah dan bisa dipantau di halaman Transaksi admin." },
          ].map((s) => (
            <article key={s.t} className="rounded-[14px] border border-line bg-paper p-5 sm:p-6">
              <h2 className="text-lg font-bold">{s.t}</h2>
              <p className="mt-2 text-sm leading-7 text-ink/60">{s.d}</p>
            </article>
          ))}
        </div>

        <p className="mt-8 rounded-[14px] bg-ink p-5 text-sm leading-6 text-paper/70">
          Butuh bantuan refund? <a href="mailto:halo@tripora.id" className="font-bold text-coral underline underline-offset-4">halo@tripora.id</a>
          {" · "}Lacak status di <Link href="/my-trips" className="font-bold text-coral underline underline-offset-4">My Trips</Link>.
        </p>
      </section>
      <SiteFooter />
    </main>
  );
}

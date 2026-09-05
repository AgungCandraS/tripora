import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "../components/site-header";

export const metadata: Metadata = {
  title: "Tentang Kami | Tripora",
  description: "Marketplace booking wisata dan aktivitas lokal Bandung Raya.",
};

const CLUSTERS = ["Bandung City", "Lembang", "Ciwidey", "Pangalengan", "Dago", "Bandung Barat", "Rancabali"];

export default function TentangPage() {
  return (
    <main className="bg-paper text-ink">
      <SiteHeader />
      <section className="mx-auto max-w-[860px] px-5 pb-24 pt-14 sm:pt-20">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-coral-dark">Tentang Tripora</p>
        <h1 className="display-text mt-2 text-3xl font-bold tracking-[-0.045em] sm:text-5xl">
          Wisata lokal, dipesan tanpa drama.
        </h1>
        <p className="mt-4 max-w-[640px] text-sm leading-7 text-ink/60">
          Tripora adalah marketplace booking wisata dan aktivitas lokal. Launch awal berfokus di <strong>Bandung Raya</strong> —
          dari rafting Pangalengan, ATV Lembang, glamping Ciwidey, sampai heritage walk Kota Bandung — dengan lifecycle lengkap:
          discovery → availability transparan → reservation hold → pembayaran Mayar → QR e-ticket → check-in vendor → review.
          Arsitektur multi-region disiapkan agar ekspansi ke kota lain tidak perlu redesign.
        </p>

        <h2 className="mt-10 text-xl font-bold">Cluster destinasi awal</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {CLUSTERS.map((c) => (
            <span key={c} className="rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold">
              {c}
            </span>
          ))}
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { t: "Untuk traveler", d: "Guest checkout tanpa wajib daftar, harga final dari backend, tiket QR sekali pakai." },
            { t: "Untuk vendor", d: "Dashboard operasional: listing, jadwal, booking, check-in, revenue, payout — plus halaman bantuan tiap workspace." },
            { t: "Untuk semua", d: "Audit trail, isolasi data per vendor, dan kebijakan refund yang jelas." },
          ].map((c) => (
            <div key={c.t} className="rounded-[14px] border border-line bg-paper p-5">
              <h3 className="font-bold">{c.t}</h3>
              <p className="mt-2 text-sm leading-6 text-ink/60">{c.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/explore" className="rounded-[10px] bg-coral px-5 py-3.5 text-sm font-bold text-ink transition hover:bg-[#ed8c6b]">
            Mulai explore
          </Link>
          <Link href="/vendor/onboarding" className="rounded-[10px] border border-line px-5 py-3.5 text-sm font-bold hover:border-ink/40">
            Jadi vendor
          </Link>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

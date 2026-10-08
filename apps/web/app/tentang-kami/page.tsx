import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "../components/site-header";

export const metadata: Metadata = {
  title: "Tentang Kami | Tripora",
  description: "Marketplace booking wisata dan aktivitas lokal Bandung Raya.",
};

const CLUSTERS = [
  "Bandung Kota",
  "Lembang",
  "Ciwidey",
  "Pangalengan",
  "Dago",
  "Bandung Barat",
  "Rancabali",
];

export default function TentangPage() {
  return (
    <main className="bg-paper text-ink">
      <SiteHeader />
      <section
        id="content"
        className="mx-auto max-w-[860px] px-5 pb-24 pt-14 sm:pt-20"
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-coral-dark">
          Tentang Tripora
        </p>
        <h1 className="display-text mt-2 text-3xl font-bold tracking-[-0.045em] sm:text-5xl">
          Kenali Bandung melalui pengalaman lokal.
        </h1>
        <p className="mt-4 max-w-[640px] text-sm leading-7 text-ink/60">
          Tripora membantu Anda menemukan wisata, kuliner, kafe, dan aktivitas
          lokal di Bandung Raya. Jelajahi tempat berdasarkan kawasan, simpan
          pilihan Anda, lalu susun rencana perjalanan. Aktivitas dari mitra yang
          menyediakan pemesanan dapat dipilih berdasarkan paket dan jadwal yang
          tersedia, dengan tiket setelah pembayaran dikonfirmasi.
        </p>

        <h2 className="mt-10 text-xl font-bold">
          Kawasan yang dapat dijelajahi
        </h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {CLUSTERS.map((c) => (
            <span
              key={c}
              className="rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold"
            >
              {c}
            </span>
          ))}
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            {
              t: "Untuk wisatawan",
              d: "Temukan tempat pilihan, bandingkan aktivitas, dan kelola pemesanan Anda.",
            },
            {
              t: "Untuk mitra lokal",
              d: "Kelola paket, jadwal, peserta, tiket, dan pendapatan melalui ruang kerja mitra.",
            },
            {
              t: "Untuk perjalanan Anda",
              d: "Lihat lokasi tujuan serta informasi paket dan kebijakan pemesanan sebelum berangkat.",
            },
          ].map((c) => (
            <div
              key={c.t}
              className="rounded-[14px] border border-line bg-paper p-5"
            >
              <h3 className="font-bold">{c.t}</h3>
              <p className="mt-2 text-sm leading-6 text-ink/60">{c.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/explore"
            className="rounded-[10px] bg-coral px-5 py-3.5 text-sm font-bold text-ink transition hover:bg-[#ed8c6b]"
          >
            Jelajahi tempat
          </Link>
          <Link
            href="/vendor/onboarding"
            className="rounded-[10px] border border-line px-5 py-3.5 text-sm font-bold hover:border-ink/40"
          >
            Daftar sebagai mitra
          </Link>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

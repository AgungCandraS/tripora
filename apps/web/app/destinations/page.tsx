import type { Metadata } from "next";
import Link from "next/link";
import { PlacePhoto } from "../components/place-card";
import { SiteFooter, SiteHeader } from "../components/site-header";
import { areaGuides } from "../lib/area-guides";

export const metadata: Metadata = {
  title: "Pilihan area Bandung | Tripora",
  description:
    "Jelajahi tempat berdasarkan area Bandung, Lembang, Ciwidey, Pangalengan, dan sekitarnya.",
};

export default function DestinationsPage() {
  return (
    <main id="content">
      <SiteHeader />
      <section className="public-container py-14 sm:py-20">
        <p className="eyebrow">Pilih arah perjalanan</p>
        <h1 className="editorial-title mt-3 max-w-2xl text-4xl sm:text-6xl">
          Jelajahi kawasan Bandung Raya.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-ink/65">
          Mulai dari area, lalu cari tempat ngopi, makan, atau main di
          sekitarnya.
        </p>
        <div className="mt-12 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {areaGuides.map((guide) => (
            <Link
              href={`/destinations/${guide.slug}`}
              key={guide.slug}
              className="group"
              data-motion
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-sage">
                <PlacePhoto place={guide.cover} />
              </div>
              <p className="mt-4 text-sm text-moss">
                {guide.count} tempat untuk dijelajahi
              </p>
              <h2 className="mt-1 text-2xl font-bold">{guide.name}</h2>
              <p className="mt-2 text-sm leading-6 text-ink/65">
                {guide.description}
              </p>
              <span className="mt-3 inline-flex min-h-11 items-center font-bold text-moss">
                Jelajahi area ↗
              </span>
            </Link>
          ))}
        </div>
        <p className="mt-12 text-sm text-ink/60">
          Area diperkirakan dari alamat pada data 1 Oktober 2026. Periksa peta
          untuk memastikan lokasi.
        </p>
      </section>
      <SiteFooter />
    </main>
  );
}

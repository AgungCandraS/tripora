import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PlaceCard, PlacePhoto } from "../../components/place-card";
import { SiteFooter, SiteHeader } from "../../components/site-header";
import { areaGuide } from "../../lib/area-guides";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const guide = areaGuide((await params).slug);
  return {
    title: guide ? `${guide.name} | Tripora` : "Area tidak ditemukan | Tripora",
    description: guide?.description,
  };
}

export default async function DestinationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const guide = areaGuide((await params).slug);
  if (!guide) notFound();
  return (
    <main id="content">
      <SiteHeader />
      <section className="public-container py-10 sm:py-16">
        <Link
          href="/destinations"
          className="inline-flex min-h-11 items-center font-semibold text-moss"
        >
          ← Semua area
        </Link>
        <div className="mt-6 grid items-center gap-8 lg:grid-cols-2">
          <div>
            <p className="eyebrow">Bandung dan sekitarnya</p>
            <h1 className="editorial-title mt-3 text-5xl sm:text-6xl">
              {guide.name}
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-ink/65">
              {guide.description}
            </p>
            <Link
              href={`/explore?area=${encodeURIComponent(guide.name)}`}
              className="primary-button mt-7"
            >
              Lihat {guide.count} tempat
            </Link>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-sage">
            <PlacePhoto place={guide.cover} priority />
          </div>
        </div>
        <div className="mt-16 flex flex-wrap items-end justify-between gap-4 border-t border-line pt-8">
          <div>
            <p className="eyebrow">Dari data lokal</p>
            <h2 className="editorial-title mt-2 text-3xl sm:text-4xl">
              Tempat untuk rencana berikutnya.
            </h2>
          </div>
          <Link
            href={`/explore?area=${encodeURIComponent(guide.name)}`}
            className="secondary-button"
          >
            Lihat semua
          </Link>
        </div>
        <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {guide.places.map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}
        </div>
        <p className="mt-10 text-sm leading-6 text-ink/60">
          Area diperkirakan dari alamat sumber. Foto dan informasi berasal dari
          data Google Maps pada 1 Oktober 2026; konfirmasi informasi terbaru
          sebelum berangkat.
        </p>
      </section>
      <SiteFooter />
    </main>
  );
}

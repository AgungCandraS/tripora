import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { places } from "../../lib/places";
import { PlaceCard, PlacePhoto, SavePlace } from "../../components/place-card";
import { SiteFooter, SiteHeader } from "../../components/site-header";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const found = places.find((value) => value.slug === slug);
  return {
    title: found
      ? `${found.name} — Bandung | Tripora`
      : "Tempat tidak ditemukan | Tripora",
    description: found
      ? `${found.subcategory} di ${found.area}. Lihat alamat, lokasi, dan informasi kunjungan.`
      : undefined,
  };
}

export default async function PlacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const place = places.find((value) => value.slug === slug);
  if (!place) notFound();
  const related = places
    .filter(
      (value) =>
        value.id !== place.id &&
        value.category === place.category &&
        value.area === place.area,
    )
    .slice(0, 3);
  return (
    <main>
      <SiteHeader />
      <section id="content" className="public-container pb-16 pt-8">
        <nav
          aria-label="Lokasi halaman"
          className="mb-7 flex flex-wrap gap-2 text-sm text-ink/65"
        >
          <Link href="/explore" className="underline underline-offset-4">
            Jelajahi
          </Link>
          <span aria-hidden="true">/</span>
          <Link
            href={`/explore?area=${encodeURIComponent(place.area)}`}
            className="underline underline-offset-4"
          >
            {place.area}
          </Link>
          <span aria-hidden="true">/</span>
          <span>{place.name}</span>
        </nav>
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="eyebrow">
              {place.subcategory ?? place.categoryLabel} · {place.area}
            </p>
            <h1 className="editorial-title mt-3 max-w-4xl text-4xl sm:text-6xl">
              {place.name}
            </h1>
          </div>
          <SavePlace id={place.id} label />
        </div>
        <div className="place-detail-grid mt-8">
          <div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-[20px] bg-sage">
              <PlacePhoto place={place} priority />
            </div>
            <p className="mt-3 text-xs leading-6 text-ink/65">
              {place.photo
                ? "Foto referensi dari Google Maps. Tampilan tempat dapat berubah."
                : "Belum ada foto tempat yang dapat ditampilkan."}
            </p>
            <div className="mt-8 border-t border-line pt-6">
              <h2 className="text-2xl font-bold tracking-tight">
                Sebelum berangkat
              </h2>
              <p className="mt-3 max-w-xl leading-7 text-ink/70">
                Informasi ini adalah referensi tempat, diperbarui 1 Oktober
                2026. Hubungi tempat tujuan untuk memastikan jam buka, harga,
                dan ketentuan kunjungan.
              </p>
            </div>
          </div>
          <aside className="place-information">
            <p className="eyebrow">Rencanakan kunjungan</p>
            <h2 className="mt-4 text-xl font-bold">Alamat & lokasi</h2>
            <p className="mt-3 leading-7 text-ink/70">{place.address}</p>
            <a
              href={place.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="primary-button mt-5 w-full"
            >
              Buka Google Maps <span aria-hidden="true">↗</span>
            </a>
            {place.phone && (
              <a
                href={`tel:${place.phone.replace(/[^+0-9]/g, "")}`}
                className="secondary-button mt-3 w-full"
              >
                Telepon {place.phone}
              </a>
            )}
            {place.website && (
              <a
                href={place.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-link mt-4"
              >
                Kunjungi situs tempat <span aria-hidden="true">↗</span>
              </a>
            )}
            <div className="mt-7 border-t border-line pt-5">
              <h3 className="text-sm font-bold">Harga & jam buka</h3>
              <p className="mt-2 text-sm leading-6 text-ink/70">
                Belum dikonfirmasi. Periksa langsung sebelum datang.
              </p>
            </div>
            {place.rating !== null && (
              <div className="mt-5">
                <p className="text-sm font-bold">
                  Rating Google Maps: {place.rating.toFixed(1)} / 5
                </p>
                <p className="mt-1 text-xs text-ink/65">
                  {place.reviewCount.toLocaleString("id-ID")} ulasan sumber.
                  Bukan ulasan pemesanan Tripora.
                </p>
              </div>
            )}
            <p className="mt-6 rounded-xl bg-soft p-4 text-sm leading-6 text-ink/70">
              Tempat ini belum terhubung dengan pemesanan Tripora. Untuk mencari
              pengalaman bertiket,{" "}
              <Link
                href="/activities"
                className="font-bold underline underline-offset-4"
              >
                lihat aktivitas
              </Link>
              .
            </p>
          </aside>
        </div>
        {related.length > 0 && (
          <section className="mt-16">
            <div className="section-intro">
              <h2 className="editorial-title text-3xl">
                Sekalian ke sekitar sini.
              </h2>
              <Link
                href={`/explore?area=${encodeURIComponent(place.area)}&category=${place.category}`}
                className="text-link"
              >
                Lihat semua <span aria-hidden="true">↗</span>
              </Link>
            </div>
            <div className="mt-7 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((value) => (
                <PlaceCard key={value.id} place={value} />
              ))}
            </div>
          </section>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}

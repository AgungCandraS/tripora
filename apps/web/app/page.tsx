import Link from "next/link";
import { SiteFooter, SiteHeader } from "./components/site-header";
import { HomeHero, type HeroSlide } from "./components/home-hero";
import { PlaceCard } from "./components/place-card";
import { featuredPlaces, places } from "./lib/places";

const heroSlides: HeroSlide[] = [
  {
    image: "/images/hero-situ-cileunca.jpg",
    location: "Situ Cileunca",
    area: "Pangalengan",
    phrase: "Temukan alamnya.",
    href: "/places/situ-cileunca-pangalengan-bandung-57a28588",
    position: "center 60%",
  },
  {
    image: "/images/hero-orchid-forest.jpg",
    location: "Orchid Forest Cikole",
    area: "Lembang",
    phrase: "Nikmati suasananya.",
    href: "/places/orchid-forest-cikole-c033edde",
    position: "65% center",
  },
  {
    image: "/images/hero-ciwidey.jpg",
    location: "Glamping Legok Kondang",
    area: "Ciwidey",
    phrase: "Rencanakan liburan.",
    href: "/places/glamping-legok-kondang-lodge-2d6542f0",
  },
];

const moods = [
  {
    category: "wisata",
    label: "Wisata alam",
    caption: "Alam & tempat wisata",
    number: "01",
  },
  {
    category: "hiburan_main",
    label: "Aktivitas & rekreasi",
    caption: "Hiburan & aktivitas",
    number: "02",
  },
  {
    category: "cafe_ngopi",
    label: "Kafe & tempat bersantai",
    caption: "Kafe & tempat singgah",
    number: "03",
  },
  {
    category: "kuliner_resto",
    label: "Kuliner Bandung",
    caption: "Kuliner & restoran",
    number: "04",
  },
];

export default function HomePage() {
  const outdoors = featuredPlaces("wisata", 3);
  const cafes = featuredPlaces("cafe_ngopi", 3);
  return (
    <main id="atas">
      <SiteHeader overlay />
      <HomeHero slides={heroSlides} placeCount={places.length} />
      <section id="pilih-suasana" className="public-container pb-16 pt-6">
        <div className="mood-grid">
          {moods.map((mood) => (
            <Link
              key={mood.category}
              href={`/explore?category=${mood.category}`}
              className="mood-link"
            >
              <span className="text-xs font-semibold text-coral-dark">
                {mood.number}
              </span>
              <div>
                <h2>{mood.label}</h2>
                <p>{mood.caption}</p>
              </div>
              <span aria-hidden="true">↗</span>
            </Link>
          ))}
        </div>
      </section>
      <section className="bg-soft py-14 sm:py-20">
        <div className="public-container">
          <div className="section-intro">
            <div>
              <p className="eyebrow">Wisata alam pilihan</p>
              <h2 className="editorial-title">Temukan sisi hijau Bandung.</h2>
            </div>
            <Link href="/explore?category=wisata" className="text-link">
              Lihat tempat wisata <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <div className="mt-8 grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {outdoors.map((place) => (
              <PlaceCard key={place.id} place={place} />
            ))}
          </div>
        </div>
      </section>
      <section className="public-container py-16 sm:py-20">
        <div className="section-intro">
          <div>
            <p className="eyebrow">Kafe & tempat bersantai</p>
            <h2 className="editorial-title">
              Pilihan tempat untuk menikmati kopi.
            </h2>
          </div>
          <Link href="/explore?category=cafe_ngopi" className="text-link">
            Cari tempat ngopi <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div className="mt-8 grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {cafes.map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}
        </div>
      </section>
      <section className="public-container pb-16">
        <div className="booking-banner">
          <div>
            <p className="eyebrow">Aktivitas & tiket</p>
            <h2 className="editorial-title">
              Pilih aktivitas.
              <br />
              Tentukan jadwal Anda.
            </h2>
            <p className="mt-4 max-w-lg leading-7">
              Lihat pilihan aktivitas dari mitra Tripora, bandingkan paket, dan
              pilih jadwal yang tersedia. Lengkapi pemesanan Anda dan simpan
              tiket setelah pembayaran dikonfirmasi.
            </p>
            <Link href="/activities" className="primary-button mt-6">
              Jelajahi aktivitas <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <ol>
            {[
              [
                "01",
                "Pilih pengalaman",
                "Lihat paket, durasi, dan titik pertemuan.",
              ],
              [
                "02",
                "Atur keberangkatan",
                "Cek tanggal, jumlah peserta, dan sisa tempat.",
              ],
              [
                "03",
                "Bayar & berangkat",
                "Tiket tersedia setelah pembayaran dikonfirmasi.",
              ],
            ].map(([no, title, body]) => (
              <li key={no}>
                <span>{no}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className="public-container border-t border-line py-12">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Tawarkan aktivitas Anda di Tripora
            </h2>
            <p className="mt-2 text-ink/70">
              Jangkau wisatawan dan kelola jadwal, peserta, serta pemesanan
              melalui satu platform.
            </p>
          </div>
          <Link href="/vendor/onboarding" className="secondary-button">
            Daftar sebagai mitra <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

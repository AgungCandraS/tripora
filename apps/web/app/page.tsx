"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  SealCheck,
  CalendarBlank,
  Compass,
  LockKey,
  MagnifyingGlass,
  MapPin,
  Mountains,
  QrCode,
  ShieldCheck,
  Star,
  Ticket,
  UsersThree,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { ActivityCard } from "./components/activity-card";
import { HeroCarousel } from "./components/hero-carousel";
import { FadeUp, Stagger, StaggerItem } from "./components/motion";
import { SectionHeading } from "./components/section-heading";
import { SiteFooter, SiteHeader } from "./components/site-header";
import { api } from "./lib/api";
import type { ApiActivity, ApiCategory, ApiDestination } from "./lib/types";

function CategoryStrip() {
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<ApiCategory[]>("/categories"),
  });
  const list = categories ?? [];
  if (list.length === 0) return null;
  return (
    <div className="overflow-hidden rounded-[16px] border border-line bg-paper">
      <div className="flex items-center gap-3 border-b border-line p-5 sm:p-7">
        <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-sage text-moss">
          <Compass size={20} weight="duotone" />
        </span>
        <div>
          <p className="text-lg font-bold tracking-[-0.03em]">Jelajahi per kategori</p>
          <p className="mt-1 text-sm text-ink/55">ATV, rafting, camping, tour, kuliner, dan lainnya.</p>
        </div>
      </div>
      <div className="grid gap-2 p-5 sm:grid-cols-2 sm:p-5">
        {list.map((c) => (
          <Link
            key={c.slug}
            href={`/categories/${c.slug}`}
            className="group flex items-center justify-between rounded-[12px] bg-soft px-4 py-3.5 transition hover:bg-sage"
          >
            <span className="text-sm font-bold">{c.name}</span>
            <ArrowRight size={16} weight="bold" className="text-coral-dark transition-transform group-hover:translate-x-1" />
          </Link>
        ))}
      </div>
    </div>
  );
}

const FLOW = [
  {
    no: "01",
    title: "Discovery",
    body: "Explore cluster Bandung, kategori ATV sampai tour, lalu buka activity detail.",
  },
  {
    no: "02",
    title: "Paket · Tanggal · Slot",
    body: "Pilih package, tanggal, time slot, dan jumlah peserta sesuai kapasitas.",
  },
  {
    no: "03",
    title: "Hold 10 menit",
    body: "Slot ditahan sementara. Kapasitas = capacity − booked − hold aktif.",
  },
  {
    no: "04",
    title: "Guest checkout",
    body: "Isi nama, email, WhatsApp. Tanpa wajib daftar. Lalu bayar via Mayar.",
  },
  {
    no: "05",
    title: "QR e-ticket",
    body: "Booking confirmed dari backend, tiket signed token siap di-scan vendor.",
  },
  {
    no: "06",
    title: "Check-in & review",
    body: "Scan sekali pakai anti double, trip completed, lalu beri ulasan.",
  },
];

interface HomeReview {
  id: string;
  rating: number;
  body: string;
  activity: { title: string };
  user: { full_name: string };
}

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [guests, setGuests] = useState("2 orang");
  const reduce = useReducedMotion();

  const { data: destinations } = useQuery({
    queryKey: ["home-destinations"],
    queryFn: () => api.get<ApiDestination[]>("/destinations"),
  });
  const { data: searched } = useQuery({
    queryKey: ["home-activities"],
    queryFn: () => api.get<{ activities: ApiActivity[] }>("/search"),
  });
  const { data: categories } = useQuery({
    queryKey: ["home-categories"],
    queryFn: () => api.get<ApiCategory[]>("/categories"),
  });
  const { data: recentReviews } = useQuery({
    queryKey: ["home-reviews"],
    queryFn: () => api.get<{ reviews: HomeReview[] }>("/reviews/recent/list?limit=3"),
  });

  const destList = destinations ?? [];
  const actList = searched?.activities ?? [];
  const reviews = recentReviews?.reviews ?? [];

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (date) params.set("date", date);
    if (guests) params.set("guests", guests);
    window.location.href = params.size ? `/search?${params.toString()}` : "/explore";
  }

  return (
    <main className="overflow-hidden bg-paper text-ink">
      <div className="grain" aria-hidden="true" />

      {/* HERO */}
      <section id="atas" className="relative min-h-[min(820px,100dvh)] overflow-hidden text-paper">
        <HeroCarousel fullBleed />
        <div className="relative z-[1]">
          <SiteHeader overlay />
          <div className="mx-auto flex min-h-[min(820px,100dvh)] max-w-[1400px] items-center px-5 pb-32 pt-24 sm:px-8 lg:px-12">
            <div className="max-w-[680px]">
              <motion.p
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="mb-5 inline-flex items-center gap-2 rounded-full border border-paper/25 bg-ink/30 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-paper backdrop-blur-sm"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-coral" />
                Jelajah Bandung Raya · 6 cluster
              </motion.p>
              <motion.h1
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.75, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="display-text max-w-[600px] text-[2.6rem] font-bold leading-[0.96] tracking-[-0.06em] sm:text-5xl lg:text-[4.2rem]"
              >
                Akhir pekan, lebih dekat.
              </motion.h1>
              <motion.p
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="mt-5 max-w-[470px] text-[15px] leading-7 text-paper/75 sm:text-base"
              >
                Temukan aktivitas lokal, lihat slot yang benar-benar tersedia, checkout
                sebagai guest, terima QR e-ticket.
              </motion.p>
              <motion.div
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="mt-8 flex flex-wrap items-center gap-4"
              >
                <Link
                  className="inline-flex items-center gap-2 rounded-[12px] bg-coral px-5 py-3.5 text-sm font-bold text-ink transition duration-200 hover:-translate-y-0.5 hover:bg-[#ed8c6b]"
                  href="/explore"
                >
                  Jelajahi aktivitas <ArrowRight size={18} weight="bold" />
                </Link>
                <Link
                  className="text-sm font-bold text-paper underline underline-offset-4 hover:text-coral"
                  href="/destinations"
                >
                  Lihat destinasi
                </Link>
              </motion.div>
              <motion.dl
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.38, ease: [0.16, 1, 0.3, 1] }}
                className="mt-10 flex flex-wrap gap-x-10 gap-y-4 border-t border-paper/20 pt-6 text-sm"
              >
                {[
                  [`${actList.length}`, "aktivitas kurasi"],
                  [`${destList.length}`, "cluster destinasi"],
                  [`${categories?.length ?? 0}`, "kategori"],
                ].map(([v, l]) => (
                  <div key={l}>
                    <dt className="sr-only">{l}</dt>
                    <dd className="text-xl font-bold tracking-tight">{v}</dd>
                    <dd className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-paper/55">
                      {l}
                    </dd>
                  </div>
                ))}
              </motion.dl>
            </div>
          </div>
        </div>
      </section>

      {/* SEARCH */}
      <section id="cari" className="relative z-[2] mx-auto -mt-14 max-w-[1180px] px-5 sm:px-8">
        <FadeUp>
          <form
            onSubmit={handleSearch}
            className="grid gap-3 rounded-[16px] bg-ink p-3 text-paper shadow-[0_18px_50px_rgba(16,35,30,0.22)] sm:grid-cols-[1.3fr_0.85fr_0.85fr_auto] sm:items-end sm:p-4"
          >
            <label className="flex flex-col gap-2 px-2 py-1 sm:px-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-paper/55">
                Mau ke mana?
              </span>
              <span className="flex items-center gap-2 border-b border-paper/20 pb-2">
                <MapPin size={18} weight="fill" className="shrink-0 text-coral" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari area atau aktivitas"
                  className="min-w-0 flex-1 bg-transparent text-sm text-paper outline-none placeholder:text-paper/45"
                />
              </span>
            </label>
            <label className="flex flex-col gap-2 px-2 py-1 sm:px-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-paper/55">
                Kapan?
              </span>
              <span className="flex items-center gap-2 border-b border-paper/20 pb-2">
                <CalendarBlank size={18} className="shrink-0 text-coral" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-transparent text-sm text-paper outline-none [color-scheme:dark]"
                />
              </span>
            </label>
            <label className="flex flex-col gap-2 px-2 py-1 sm:px-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-paper/55">
                Peserta
              </span>
              <span className="flex items-center gap-2 border-b border-paper/20 pb-2">
                <UsersThree size={18} className="shrink-0 text-coral" />
                <select
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                  className="w-full bg-transparent text-sm text-paper outline-none [&>option]:text-ink"
                >
                  {["1 orang", "2 orang", "3-4 orang", "5+ orang / grup"].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </span>
            </label>
            <button
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[12px] bg-coral px-6 text-sm font-bold text-ink transition hover:bg-[#ed8c6b]"
              type="submit"
            >
              <MagnifyingGlass size={18} weight="bold" /> Cari
            </button>
          </form>
        </FadeUp>
        <FadeUp delay={0.1} className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-ink/55">
          <span className="mr-1">Populer:</span>
          {["Rafting Pangalengan", "Glamping Ciwidey", "ATV Lembang", "City walk"].map((t) => (
            <Link
              key={t}
              href={`/search?q=${encodeURIComponent(t)}`}
              className="rounded-full border border-line bg-paper px-3 py-1.5 transition hover:border-ink/40 hover:text-ink"
            >
              {t}
            </Link>
          ))}
          <span className="ml-auto hidden items-center gap-1.5 sm:inline-flex">
            <LockKey size={13} className="text-moss" /> Guest checkout · Hold 10 menit
          </span>
        </FadeUp>
      </section>

      {/* TRUST */}
      <section aria-label="Keunggulan" className="mx-auto max-w-[1400px] px-5 pt-12 sm:px-8 lg:px-12">
        <Stagger className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { icon: Ticket, t: "Guest checkout", d: "Tanpa wajib daftar" },
            { icon: ShieldCheck, t: "Anti oversold", d: "Slot dikunci backend" },
            { icon: QrCode, t: "QR e-ticket", d: "Signed, sekali pakai" },
            { icon: SealCheck, t: "Vendor lokal", d: "Terverifikasi Bandung" },
          ].map(({ icon: Icon, t, d }) => (
            <StaggerItem key={t}>
              <div className="flex items-center gap-3 rounded-[12px] border border-line bg-paper px-4 py-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-sage text-moss">
                  <Icon size={19} weight="duotone" />
                </span>
                <span>
                  <span className="block text-sm font-bold">{t}</span>
                  <span className="block text-xs text-ink/50">{d}</span>
                </span>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* DESTINATIONS */}
      <section id="destinasi" className="mx-auto max-w-[1400px] px-5 pb-20 pt-20 sm:px-8 lg:px-12 lg:pb-24 lg:pt-28">
        <SectionHeading
          eyebrow="Bandung Discovery Structure"
          title="Pilih suasana yang kamu cari."
          description="Enam cluster awal Bandung Raya. Masing-masing punya landing SEO sendiri — dari heritage kota sampai jalur hijau selatan."
          action={
            <Link href="/destinations" className="inline-flex items-center gap-1 text-sm font-bold text-ink underline underline-offset-4 hover:text-coral-dark">
              Lihat semua <ArrowRight size={16} weight="bold" />
            </Link>
          }
        />
        <Stagger className="mt-10 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {destList.slice(0, 4).map((destination, index) => (
            <StaggerItem key={destination.slug} className={index === 1 ? "mt-6 lg:mt-12" : index === 3 ? "mt-3 lg:mt-6" : ""}>
              <Link href={`/destinations/${destination.slug}`} className="image-card group block">
                <div className="relative aspect-[0.78] overflow-hidden rounded-[16px] bg-sage">
                  <Image
                    src="/images/hero-pangalengan.png"
                    alt={`Pemandangan wisata di ${destination.name}`}
                    fill
                    sizes="(max-width: 1024px) 50vw, 22vw"
                    className="card-image object-cover"
                  />
                  <span className="absolute bottom-3 left-3 rounded-full bg-ink/70 px-2.5 py-1 text-[11px] font-bold text-paper backdrop-blur-sm">
                    {(destination.activities ?? []).length} aktivitas
                  </span>
                </div>
                <div className="pt-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-coral-dark">
                    {destination.region?.name ?? ""}
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <h3 className="text-lg font-bold tracking-[-0.035em]">{destination.name}</h3>
                    <ArrowRight size={17} className="shrink-0 text-coral-dark transition-transform group-hover:translate-x-1" weight="bold" />
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-ink/55">{destination.description}</p>
                </div>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* KATEGORI */}
      <section id="wisata" className="bg-soft px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-[1400px]">
          <SectionHeading
            eyebrow="Tempat wisata Bandung"
            title="Mulai dari tempatnya, lanjutkan ke pengalamannya."
            description="Tripora membedakan destination, activity, package, schedule, dan slot — supaya kamu tahu mana yang bisa dibooking dan mana yang gratis."
          />
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            <FadeUp><CategoryStrip /></FadeUp>
            <FadeUp delay={0.1}>
              <div className="flex h-full flex-col justify-between overflow-hidden rounded-[16px] bg-ink p-5 text-paper sm:p-7">
                <div>
                  <p className="text-lg font-bold tracking-[-0.03em]">Bisa dibooking langsung</p>
                  <p className="mt-1 text-sm text-paper/55">Vendor lokal · slot & paket jelas · QR e-ticket.</p>
                </div>
                <Link
                  href="/explore"
                  className="mt-6 inline-flex items-center justify-center gap-2 rounded-[10px] bg-coral px-4 py-3 text-sm font-bold text-ink transition hover:bg-[#ed8c6b]"
                >
                  Cari pengalaman <ArrowRight size={15} weight="bold" />
                </Link>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ACTIVITIES */}
      <section id="aktivitas" className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <SectionHeading
          eyebrow="Pilihan partner lokal"
          title="Aktivitas untuk setiap rencana."
          description="Satu activity bisa punya banyak package — Short, Adventure, Extreme — dengan harga, durasi, dan kapasitas sendiri."
          action={
            <Link href="/activities" className="inline-flex items-center gap-1 text-sm font-bold text-ink underline underline-offset-4 hover:text-coral-dark">
              Lihat semua <ArrowRight size={16} weight="bold" />
            </Link>
          }
        />
        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {actList.slice(0, 3).map((activity, i) => (
            <ActivityCard key={activity.slug} activity={activity} index={i} />
          ))}
        </div>
      </section>

      {/* FLOW */}
      <section id="cara-kerja" className="border-y border-line bg-paper">
        <div className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
          <SectionHeading
            eyebrow="Core customer flow"
            title="Dari ingin pergi sampai benar-benar berangkat."
            description="Lifecycle lengkap PRD: availability dihitung backend, reservation hold 10 menit, pembayaran Mayar via webhook, QR sekali pakai."
          />
          <Stagger className="mt-12 grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {FLOW.map((s) => (
              <StaggerItem key={s.no}>
                <div className="border-t-2 border-ink pt-5">
                  <p className="text-xs font-bold tracking-[0.16em] text-coral-dark">{s.no}</p>
                  <h3 className="mt-2 text-lg font-bold tracking-[-0.03em]">{s.title}</h3>
                  <p className="mt-2 max-w-[300px] text-sm leading-6 text-ink/60">{s.body}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
          <FadeUp className="mt-10 flex flex-wrap items-center gap-3 rounded-[12px] bg-soft px-5 py-4 text-sm text-ink/65">
            <ShieldCheck size={20} className="shrink-0 text-moss" />
            <p>
              <strong className="text-ink">Available = capacity − confirmed − hold aktif.</strong>{" "}
              Jika sisa 1 dan dua orang booking bersamaan, satu berhasil dan satu menerima{" "}
              <code className="rounded bg-paper px-1.5 py-0.5 text-xs font-bold">SLOT_NOT_AVAILABLE</code>.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* REVIEWS */}
      <section id="ulasan" className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
        <SectionHeading
          eyebrow="Review terverifikasi"
          title="Cerita setelah check-in."
          description="Ulasan hanya dari trip completed — menjaga rating tetap jujur untuk vendor dan customer berikutnya."
          action={
            <Link href="/explore" className="inline-flex items-center gap-1 text-sm font-bold text-ink underline underline-offset-4 hover:text-coral-dark">
              Coba sendiri <ArrowRight size={16} weight="bold" />
            </Link>
          }
        />
        <Stagger className="mt-10 grid gap-5 md:grid-cols-3">
          {reviews.length === 0 ? (
            <p className="rounded-[12px] border border-dashed border-line bg-paper px-5 py-8 text-center text-sm text-ink/55 md:col-span-3">
              Belum ada ulasan terverifikasi. Jadilah yang pertama setelah trip COMPLETED.
            </p>
          ) : (
            reviews.map((r) => (
              <StaggerItem key={r.id}>
                <figure className="flex h-full flex-col rounded-[16px] border border-line bg-paper p-6">
                  <div className="flex items-center gap-1 text-sm font-bold">
                    <Star size={15} weight="fill" className="text-coral-dark" /> {String(r.rating).replace(".", ",")},0
                    <span className="ml-2 rounded-full bg-sage px-2 py-0.5 text-[11px] font-bold text-moss">
                      COMPLETED
                    </span>
                  </div>
                  <blockquote className="mt-4 flex-1 text-[15px] leading-7 text-ink/70">
                    “{r.body}”
                  </blockquote>
                  <figcaption className="mt-5 border-t border-line pt-4">
                    <p className="text-sm font-bold">{r.user.full_name}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink/50">
                      <Compass size={13} /> {r.activity.title}
                    </p>
                  </figcaption>
                </figure>
              </StaggerItem>
            ))
          )}
        </Stagger>
      </section>

      {/* VENDOR */}
      <section id="partner" className="mx-5 mb-8 overflow-hidden rounded-[16px] bg-ink text-paper sm:mx-8 lg:mx-12">
        <div className="mx-auto grid max-w-[1400px] grid-cols-1 items-center lg:grid-cols-[1.1fr_0.9fr]">
          <FadeUp className="px-6 py-14 sm:px-12 sm:py-20 lg:px-16">
            <Mountains size={28} weight="duotone" className="text-coral" />
            <h2 className="display-text mt-6 max-w-[520px] text-4xl font-bold leading-[1.02] sm:text-5xl">
              Punya aktivitas lokal di Bandung?
            </h2>
            <p className="mt-5 max-w-[440px] text-base leading-7 text-paper/60">
              Onboarding → verifikasi → buat activity, package, schedule, kapasitas →
              terima booking, scan QR, terima payout. Komisi 10% tercatat sebagai snapshot.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="mailto:partner@tripora.id"
                className="inline-flex items-center gap-2 rounded-[12px] bg-coral px-5 py-3.5 text-sm font-bold text-ink transition duration-200 hover:-translate-y-0.5 hover:bg-[#ed8c6b]"
              >
                Jadi vendor <ArrowRight size={18} weight="bold" />
              </Link>
              <Link
                href="/vendor"
                className="inline-flex items-center gap-2 rounded-[12px] border border-paper/25 px-5 py-3.5 text-sm font-bold text-paper transition hover:bg-paper/10"
              >
                Lihat dashboard
              </Link>
            </div>
          </FadeUp>
          <div className="relative min-h-[300px] overflow-hidden lg:min-h-[460px]">
            <Image
              src="/images/activity-rafting.png"
              alt="Operator lokal menyiapkan pengalaman wisata alam"
              fill
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="object-cover"
            />
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-[12px] bg-paper/95 px-4 py-3 text-ink backdrop-blur-sm">
              <p className="text-sm font-bold">Palayangan River Club</p>
              <p className="text-xs font-semibold text-moss">Approved · 4 listing</p>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

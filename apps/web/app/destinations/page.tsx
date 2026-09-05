import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "../components/static-icons";
import { SiteFooter, SiteHeader } from "../components/site-header";
import { apiPublic } from "../lib/api";
import type { ApiDestination } from "../lib/types";

export const metadata: Metadata = { title: "Destinasi Bandung Raya | Tripora", description: "Pilih cluster wisata Bandung, Lembang, Ciwidey, Pangalengan, Dago, dan Bandung Barat." };

export const revalidate = 300;

export default async function DestinationsPage() {
  const destinations = (await apiPublic<ApiDestination[]>("/destinations")) ?? [];
  return <main><SiteHeader /><section className="mx-auto max-w-[1400px] px-5 pb-20 pt-14 sm:px-8 sm:pt-20 lg:px-12"><div className="max-w-[680px]"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-coral-dark">Destination guide</p><h1 className="display-text mt-3 text-4xl font-bold leading-[1.0] tracking-[-0.05em] sm:text-5xl">Bandung dimulai dari suasananya.</h1><p className="mt-5 max-w-[560px] text-base leading-7 text-ink/60">Pilih area yang paling cocok untuk rencanamu, lalu temukan aktivitas, tempat, dan rute di sekitarnya.</p></div>{destinations.length === 0 ? <p className="mt-12 rounded-[12px] border border-dashed border-line bg-paper px-5 py-10 text-center text-sm text-ink/55">Destinasi belum bisa dimuat. Pastikan API jalan lalu muat ulang.</p> : <div className="mt-12 grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">{destinations.map((destination) => <Link key={destination.slug} href={`/destinations/${destination.slug}`} className="image-card group"><div className="relative aspect-[1.05] overflow-hidden rounded-[16px] bg-sage"><Image src="/images/hero-pangalengan.png" alt={`Lanskap ${destination.name}`} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="card-image object-cover" /></div><div className="pt-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold text-coral-dark">{destination.region?.name ?? destination.province ?? ""}</p><h2 className="mt-1 text-2xl font-bold tracking-[-0.04em]">{destination.name}</h2></div><ArrowRightIcon className="text-coral-dark transition-transform group-hover:translate-x-1" /></div><p className="mt-2 text-sm leading-6 text-ink/60">{destination.description}</p><p className="mt-3 text-xs font-bold text-ink/50">{(destination.activities ?? []).length} aktivitas</p></div></Link>)}</div>}</section><SiteFooter /></main>;
}

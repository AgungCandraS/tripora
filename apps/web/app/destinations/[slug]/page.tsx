import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityCard } from "../../components/activity-card";
import { ArrowRightIcon, MapPinIcon } from "../../components/static-icons";
import { SiteFooter, SiteHeader } from "../../components/site-header";
import { apiPublic } from "../../lib/api";
import type { ApiCategory, ApiDestination } from "../../lib/types";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const destination = await apiPublic<ApiDestination>(`/destinations/${slug}`);
  return destination ? { title: `${destination.name} | Tripora`, description: destination.description ?? undefined } : { title: "Destinasi tidak ditemukan | Tripora" };
}

export default async function DestinationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const destination = await apiPublic<ApiDestination>(`/destinations/${slug}`);
  if (!destination) notFound();
  const related = destination.activities ?? [];
  const categories = (await apiPublic<ApiCategory[]>("/categories")) ?? [];
  return <main><SiteHeader /><section className="mx-auto max-w-[1400px] px-5 pb-20 pt-8 sm:px-8 lg:px-12"><div className="grid items-end gap-8 lg:grid-cols-[0.85fr_1.15fr]"><div><Link href="/destinations" className="text-sm font-bold text-coral-dark underline underline-offset-4">Semua destinasi</Link><p className="mt-10 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-coral-dark"><MapPinIcon /> {destination.region?.name ?? ""}</p><h1 className="display-text mt-3 text-4xl font-bold leading-[1.0] tracking-[-0.05em] sm:text-5xl">{destination.name}</h1><p className="mt-6 max-w-[500px] text-base leading-7 text-ink/65">{destination.description}</p><Link href={`/explore?area=${destination.slug}`} className="mt-7 inline-flex items-center gap-2 rounded-[12px] bg-ink px-5 py-3.5 text-sm font-bold text-paper transition hover:bg-moss">Jelajahi area ini <ArrowRightIcon /></Link><dl className="mt-8 flex flex-wrap gap-x-8 gap-y-3 border-t border-line pt-5 text-sm"><div><dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink/45">Pengalaman</dt><dd className="mt-1 text-lg font-bold">{related.length}</dd></div><div><dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink/45">Region</dt><dd className="mt-1 text-lg font-bold">{destination.region?.name ?? "-"}</dd></div><div><dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink/45">Bahasa</dt><dd className="mt-1 text-lg font-bold">Indonesia</dd></div></dl></div><div className="relative aspect-[1.18] overflow-hidden rounded-[16px] bg-sage"><Image src="/images/hero-pangalengan.png" alt={`Pemandangan ${destination.name}`} fill priority sizes="(max-width: 1024px) 100vw, 60vw" className="object-cover" /></div></div><div className="mt-20 border-t border-line pt-8"><div className="flex items-end justify-between gap-5"><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-coral-dark">Pilihan lokal</p><h2 className="mt-2 text-3xl font-bold tracking-[-0.045em]">Aktivitas di {destination.name}</h2></div><span className="text-sm font-semibold text-ink/50">{related.length} pengalaman</span></div>{related.length ? <div className="mt-8 grid gap-5 md:grid-cols-3">{related.map((activity, i) => <ActivityCard key={activity.slug} activity={activity} index={i} />)}</div> : <p className="mt-8 rounded-[14px] bg-soft px-5 py-6 text-sm text-ink/60">Aktivitas di area ini sedang dikurasi.</p>}</div><div className="mt-14 border-t border-line pt-7"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-coral-dark">Lanjut by kategori</p><div className="mt-3.5 flex flex-wrap gap-2">{categories.map((c) => <Link key={c.slug} href={`/categories/${c.slug}`} className="rounded-full border border-line bg-paper px-3.5 py-2 text-[13px] font-semibold transition hover:border-ink/40">{c.name}</Link>)}</div></div></section><SiteFooter /></main>;
}

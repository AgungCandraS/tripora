import type { Metadata } from "next";
import { ExploreClient } from "../components/explore-client";
import { SiteFooter, SiteHeader } from "../components/site-header";

export const metadata: Metadata = { title: "Cari pengalaman | Tripora", description: "Cari aktivitas dan tempat wisata di Bandung Raya." };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; date?: string; guests?: string }> }) {
  const { q = "", date = "", guests = "" } = await searchParams;
  return <main><SiteHeader /><ExploreClient initialQuery={q} initialDate={date} initialGuests={guests} title={q ? `Hasil pencarian untuk “${q}”.` : "Cari pengalaman Bandung yang kamu mau."} description="Gunakan kata kunci area, kategori, atau jenis pengalaman untuk menemukan pilihan yang lebih relevan." /><SiteFooter /></main>;
}

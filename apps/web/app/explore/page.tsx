import type { Metadata } from "next";
import { ExploreClient } from "../components/explore-client";
import { SiteFooter, SiteHeader } from "../components/site-header";

export const metadata: Metadata = { title: "Explore Bandung | Tripora", description: "Cari aktivitas wisata dan pengalaman lokal di Bandung Raya." };

export default function ExplorePage() {
  return <main><SiteHeader /><ExploreClient /><SiteFooter /></main>;
}

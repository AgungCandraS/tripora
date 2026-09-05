import type { Metadata } from "next";
import { ExploreClient } from "../components/explore-client";
import { SiteFooter, SiteHeader } from "../components/site-header";

export const metadata: Metadata = { title: "Aktivitas Bandung | Tripora", description: "Jelajahi rafting, camping, family activity, tour, dan pengalaman lokal Bandung." };

export default function ActivitiesPage() {
  return <main><SiteHeader /><ExploreClient title="Aktivitas untuk rencana yang berbeda." description="Dari rafting sampai city walk, temukan pengalaman lokal yang bisa dipilih jadwalnya." /><SiteFooter /></main>;
}

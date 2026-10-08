import type { Metadata } from "next";
import { Suspense } from "react";
import { PlaceExplorer } from "../components/place-explorer";
import { SiteFooter, SiteHeader } from "../components/site-header";

export const metadata: Metadata = {
  title: "Tempat main di Bandung | Tripora",
  description:
    "Temukan tempat wisata, ngopi, makan, dan bermain di Bandung Raya.",
};

export default function ExplorePage() {
  return (
    <main>
      <SiteHeader />
      <Suspense
        fallback={
          <p className="public-container py-20" role="status">
            Memuat pencarian…
          </p>
        }
      >
        <PlaceExplorer />
      </Suspense>
      <SiteFooter />
    </main>
  );
}

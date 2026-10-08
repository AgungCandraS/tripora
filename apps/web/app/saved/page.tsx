import { Suspense } from "react";
import { PlaceExplorer } from "../components/place-explorer";
import { SiteFooter, SiteHeader } from "../components/site-header";

export default function SavedPage() {
  return (
    <main>
      <SiteHeader />
      <Suspense
        fallback={
          <p className="public-container py-20">Memuat tempat tersimpan…</p>
        }
      >
        <PlaceExplorer savedOnly />
      </Suspense>
      <SiteFooter />
    </main>
  );
}

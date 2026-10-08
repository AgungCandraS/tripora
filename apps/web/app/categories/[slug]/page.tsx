export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExploreClient } from "../../components/explore-client";
import { SiteFooter, SiteHeader } from "../../components/site-header";
import { apiPublic } from "../../lib/api";
import type { ApiCategory } from "../../lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await apiPublic<ApiCategory>(`/categories/${slug}`);
  return category
    ? {
        title: `${category.name} Bandung | Tripora`,
        description: `Aktivitas ${category.name} di Bandung Raya.`,
      }
    : { title: "Kategori tidak ditemukan | Tripora" };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await apiPublic<ApiCategory>(`/categories/${slug}`);
  if (!category) notFound();
  return (
    <main>
      <SiteHeader />
      <ExploreClient
        initialCategory={slug}
        title={`${category.name} Bandung, dipilih untuk akhir pekan.`}
        description={`Jelajahi ${category.name.toLowerCase()} dari vendor lokal Bandung Raya.`}
      />
      <SiteFooter />
    </main>
  );
}

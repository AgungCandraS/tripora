export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActivityDetailClient } from "../../components/activity-detail-client";
import { SiteFooter, SiteHeader } from "../../components/site-header";
import { apiPublic } from "../../lib/api";
import type { ApiActivity } from "../../lib/types";

export const revalidate = 120;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const activity = await apiPublic<ApiActivity>(`/activities/${slug}`);
  return activity
    ? {
        title: `${activity.title} | Tripora`,
        description: activity.short_description ?? undefined,
      }
    : { title: "Aktivitas tidak ditemukan | Tripora" };
}

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const activity = await apiPublic<ApiActivity>(`/activities/${slug}`);
  if (!activity) notFound();
  return (
    <main>
      <SiteHeader />
      <ActivityDetailClient activity={activity} />
      <SiteFooter />
    </main>
  );
}

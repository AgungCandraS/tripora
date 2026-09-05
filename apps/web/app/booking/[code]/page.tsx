import type { Metadata } from "next";
import { BookingDetailClient } from "../../components/booking-detail-client";
import { SiteFooter, SiteHeader } from "../../components/site-header";

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `Booking ${code} | Tripora`,
    description: `Konfirmasi booking ${code} — QR e-ticket, ringkasan pembayaran, dan ulasan.`,
    robots: { index: false, follow: false },
  };
}

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return (
    <main className="bg-paper text-ink">
      <SiteHeader />
      <section className="mx-auto max-w-[1100px] px-5 pb-24 pt-10 sm:px-8 lg:px-12">
        <BookingDetailClient code={code.toUpperCase()} />
      </section>
      <SiteFooter />
    </main>
  );
}

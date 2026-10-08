import type { Metadata } from "next";
import { CheckoutClient } from "../components/checkout-client";
import { SiteFooter, SiteHeader } from "../components/site-header";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Checkout | Tripora",
  description: "Lengkapi detail guest checkout Tripora.",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{
    package?: string;
    slot?: string;
    date?: string;
    guests?: string;
  }>;
}) {
  const {
    package: packageId = "",
    slot = "",
    date = "",
    guests = "2",
  } = await searchParams;
  const guestCount = Number(guests);
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const parsedDate = new Date(`${date}T00:00:00Z`);
  const valid =
    uuid.test(packageId) &&
    uuid.test(slot) &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    Number.isFinite(parsedDate.getTime()) &&
    parsedDate.toISOString().slice(0, 10) === date &&
    Number.isInteger(guestCount) &&
    guestCount >= 1 &&
    guestCount <= 1000;
  return (
    <main id="content">
      <SiteHeader />
      {valid ? (
        <CheckoutClient
          packageId={packageId}
          scheduleId={slot}
          date={date}
          guests={guestCount}
        />
      ) : (
        <section className="page-wrap py-20">
          <h1 className="editorial-title text-4xl">
            Pilih jadwal perjalanan dulu.
          </h1>
          <p className="mt-4 text-ink/65">
            Detail paket, tanggal, atau peserta belum lengkap. Pilih kembali
            dari halaman aktivitas.
          </p>
          <Link href="/activities" className="primary-button mt-6">
            Cari aktivitas
          </Link>
        </section>
      )}
      <SiteFooter />
    </main>
  );
}

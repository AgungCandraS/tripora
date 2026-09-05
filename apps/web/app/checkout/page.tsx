import type { Metadata } from "next";
import { CheckoutClient } from "../components/checkout-client";
import { SiteFooter, SiteHeader } from "../components/site-header";

export const metadata: Metadata = { title: "Checkout | Tripora", description: "Lengkapi detail guest checkout Tripora.", robots: { index: false, follow: false } };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ package?: string; slot?: string; date?: string; guests?: string }> }) {
  const { package: packageId = "", slot = "", date = "", guests = "2" } = await searchParams;
  const guestCount = Math.max(1, Math.min(20, Number(guests) || 2));
  return <main><SiteHeader /><CheckoutClient packageId={packageId} scheduleId={slot} date={date} guests={guestCount} /><SiteFooter /></main>;
}

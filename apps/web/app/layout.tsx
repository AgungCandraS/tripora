import type { Metadata } from "next";
import Providers from "./components/providers";
import { SiteMotion } from "./components/site-motion";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tripora | Temukan pengalaman Bandung",
  description:
    "Booking aktivitas lokal di Bandung Raya. Cari tempat, pilih jadwal, dan berangkat tanpa ribet.",
  openGraph: {
    title: "Tripora | Temukan pengalaman Bandung",
    description:
      "Aktivitas lokal, jadwal yang jelas, dan booking wisata Bandung dalam satu tempat.",
    type: "website",
    locale: "id_ID",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>
        <a href="#content" className="skip-link">
          Lompat ke konten
        </a>
        <Providers>
          <SiteMotion>{children}</SiteMotion>
        </Providers>
      </body>
    </html>
  );
}

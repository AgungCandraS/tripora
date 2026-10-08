import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Standalone untuk Docker; Vercel tetap deploy normal.
  output: "standalone",
  turbopack: {},
  images: {
    // Workers free deployment serves local photos without a paid Images binding.
    unoptimized: process.env.CLOUDFLARE_DEPLOY === "true",
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
    ],
  },
  /**
   * Alias route PRD (§77-80) ke halaman kanonis. Satu implementasi, dua URL —
   * redirect (bukan duplikat halaman) agar sidebar + analytics konsisten.
   */
  async redirects() {
    return [
      { source: "/booking", destination: "/my-trips", permanent: false },
      { source: "/trips", destination: "/account/trips", permanent: false },
      {
        source: "/trips/:code",
        destination: "/booking/:code",
        permanent: false,
      },
      {
        source: "/wishlist",
        destination: "/account/wishlist",
        permanent: false,
      },
      { source: "/profile", destination: "/account/profile", permanent: false },
      { source: "/reviews", destination: "/account/reviews", permanent: false },
      {
        source: "/vendor/packages",
        destination: "/vendor/activities",
        permanent: false,
      },
      {
        source: "/vendor/calendar",
        destination: "/vendor/schedules",
        permanent: false,
      },
      {
        source: "/vendor/promotions",
        destination: "/vendor/promos",
        permanent: false,
      },
      {
        source: "/admin/customers",
        destination: "/admin/users",
        permanent: false,
      },
      {
        source: "/admin/payments",
        destination: "/admin/transactions",
        permanent: false,
      },
      {
        source: "/admin/promotions",
        destination: "/admin/promos",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;

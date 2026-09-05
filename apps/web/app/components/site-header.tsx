"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight, List, X } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const NAV = [
  { href: "/explore", label: "Explore" },
  { href: "/destinations", label: "Destinasi" },
  { href: "/activities", label: "Aktivitas" },
  { href: "/my-trips", label: "My Trips" },
];

export function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    lastY.current = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const y = window.scrollY;
        setScrolled(y > 24);
        setHidden((prev) => {
          if (reduce || open || y < 160) return false;
          if (y > lastY.current + 6) return true;
          if (y < lastY.current - 6) return false;
          return prev;
        });
        lastY.current = y;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [reduce, open]);

  const solid = !overlay || scrolled;
  const tone = solid ? "text-ink" : "text-paper";

  return (
    <>
      <motion.header
        initial={false}
        animate={{ y: hidden ? "-100%" : "0%" }}
        transition={{ duration: reduce ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed inset-x-0 top-0 z-50 ${tone}`}
      >
        <div
          className={`transition-all duration-300 ${
            solid
              ? "border-b border-line bg-paper/90 backdrop-blur-md"
              : "border-b border-transparent bg-transparent"
          }`}
        >
          <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-5 sm:px-8 lg:px-12">
            <Link href="/" className="flex items-center gap-2" aria-label="Tripora beranda">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-[10px] text-base font-black transition-colors ${
                  solid ? "bg-ink text-paper" : "bg-paper text-ink"
                }`}
              >
                t
              </span>
              <span className="text-[18px] font-bold tracking-[-0.05em]">tripora</span>
              <span
                className={`ml-0.5 hidden rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] sm:inline-block ${
                  solid ? "border-line text-ink/45" : "border-paper/30 text-paper/70"
                }`}
              >
                Bandung Raya
              </span>
            </Link>

            <nav
              className={`hidden items-center gap-7 text-[13px] font-semibold lg:flex ${
                solid ? "text-ink/65" : "text-paper/75"
              }`}
              aria-label="Navigasi utama"
            >
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  className="transition-colors hover:text-coral-dark"
                  href={item.href}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="hidden items-center gap-2 lg:flex">
              <Link
                className={`px-2.5 py-2 text-[13px] font-semibold transition-colors hover:text-coral-dark ${
                  solid ? "text-ink/65" : "text-paper/75"
                }`}
                href="/auth/login"
              >
                Masuk
              </Link>
              <Link
                className="group inline-flex items-center gap-1.5 rounded-[10px] bg-coral px-3.5 py-2 text-[13px] font-bold text-ink transition duration-200 hover:bg-[#ed8c6b]"
                href="/explore"
              >
                Mulai cari
                <ArrowRight size={15} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            <button
              className={`flex h-10 w-10 items-center justify-center rounded-[10px] border lg:hidden ${
                solid ? "border-line bg-paper" : "border-paper/30 bg-paper/10"
              }`}
              type="button"
              aria-label={open ? "Tutup menu" : "Buka menu"}
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
            >
              {open ? <X size={20} weight="bold" /> : <List size={20} weight="bold" />}
            </button>
          </div>
        </div>
        <AnimatePresence initial={false}>
          {open && (
            <motion.nav
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="mx-4 mt-2 overflow-hidden rounded-[14px] border border-line bg-paper text-ink shadow-[0_18px_50px_rgba(16,35,30,0.18)] lg:hidden"
              aria-label="Navigasi mobile"
            >
              <div className="flex flex-col gap-1 p-3 text-[14px] font-semibold">
                {NAV.map((item, i) => (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.04 * i, duration: 0.25 }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between rounded-[10px] px-3 py-2.5 hover:bg-soft"
                    >
                      {item.label}
                      <ArrowUpRight size={17} className="text-ink/35" />
                    </Link>
                  </motion.div>
                ))}
                <Link
                  href="/explore"
                  onClick={() => setOpen(false)}
                  className="mt-1 inline-flex items-center justify-center gap-2 rounded-[10px] bg-ink px-4 py-3 text-[13px] font-bold text-paper"
                >
                  Mulai cari <ArrowRight size={15} weight="bold" />
                </Link>
                <p className="px-3 pb-1 pt-2 text-[11px] font-medium text-ink/45">
                  Guest checkout — tanpa wajib daftar · Hold 10 menit.
                </p>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </motion.header>
      {!overlay && <div className="h-16" aria-hidden="true" />}
    </>
  );
}

const DESTINATIONS = [
  { href: "/destinations/bandung", label: "Bandung City" },
  { href: "/destinations/lembang", label: "Lembang" },
  { href: "/destinations/ciwidey", label: "Ciwidey" },
  { href: "/destinations/pangalengan", label: "Pangalengan" },
  { href: "/destinations/dago", label: "Dago" },
  { href: "/destinations/bandung-barat", label: "Bandung Barat" },
];

const CATEGORIES = [
  { href: "/categories/atv", label: "ATV" },
  { href: "/categories/rafting", label: "Rafting" },
  { href: "/categories/camping", label: "Camping & Glamping" },
  { href: "/categories/family-activity", label: "Family Activity" },
  { href: "/categories/tour", label: "Day & Private Tour" },
];

const EXPLORE_LINKS = [
  { href: "/explore", label: "Explore" },
  { href: "/activities", label: "Semua aktivitas" },
  { href: "/destinations", label: "Semua destinasi" },
  { href: "/search", label: "Pencarian" },
  { href: "/my-trips", label: "My Trips & lookup" },
];

const HELP_LINKS = [
  { href: "/bantuan", label: "Pusat bantuan" },
  { href: "/my-trips", label: "Lacak booking" },
  { href: "/vendor/check-in", label: "QR check-in vendor" },
  { href: "/tentang-kami", label: "Tentang kami" },
];

const LEGAL_LINKS = [
  { href: "/syarat-ketentuan", label: "Syarat & Ketentuan" },
  { href: "/kebijakan-privasi", label: "Kebijakan Privasi" },
  { href: "/kebijakan-refund", label: "Kebijakan Refund" },
];

const COMPANY_LINKS = [
  { href: "/tentang-kami", label: "Tentang kami" },
  { href: "/vendor/onboarding", label: "Jadi vendor" },
  { href: "mailto:halo@tripora.id", label: "Hubungi kami" },
];

export function SiteFooter() {
  return (
    <footer className="bg-ink text-paper">
      <div className="mx-auto max-w-[1400px] px-5 pb-8 pt-14 sm:px-8 lg:px-12 lg:pt-16">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_2fr]">
          <div>
            <Link href="/" className="flex items-center gap-2" aria-label="Kembali ke beranda Tripora">
              <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-paper text-base font-black text-ink">
                t
              </span>
              <span className="text-[19px] font-bold tracking-[-0.05em]">tripora</span>
            </Link>
            <p className="mt-4 max-w-[320px] text-sm leading-6 text-paper/60">
              Marketplace booking wisata Bandung Raya. Discovery → availability →
              checkout → QR e-ticket → check-in.
            </p>
            <address className="mt-5 space-y-1.5 text-[13px] not-italic leading-6 text-paper/65">
              <p>Bandung Raya, Jawa Barat, Indonesia</p>
              <p>
                <a href="mailto:halo@tripora.id" className="transition-colors hover:text-coral">halo@tripora.id</a>
                <span className="text-paper/30"> · </span>
                <a href="mailto:partner@tripora.id" className="transition-colors hover:text-coral">partner@tripora.id</a>
              </p>
            </address>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-paper/15 px-3 py-1.5 text-xs font-semibold text-paper/65">
              <span className="h-1.5 w-1.5 rounded-full bg-coral" aria-hidden="true" />
              IDR · Asia/Jakarta · Pembayaran Mayar
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
            <nav aria-label="Destinasi">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-paper/45">
                Destinasi
              </p>
              <ul className="mt-3.5 space-y-2 text-[13px] font-medium text-paper/70">
                {DESTINATIONS.map((d) => (
                  <li key={d.href}>
                    <Link href={d.href} className="transition-colors hover:text-coral">
                      {d.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label="Jelajahi">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-paper/45">
                Jelajahi
              </p>
              <ul className="mt-3.5 space-y-2 text-[13px] font-medium text-paper/70">
                {EXPLORE_LINKS.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="transition-colors hover:text-coral">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label="Kategori">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-paper/45">
                Kategori
              </p>
              <ul className="mt-3.5 space-y-2 text-[13px] font-medium text-paper/70">
                {CATEGORIES.map((c) => (
                  <li key={c.href}>
                    <Link href={c.href} className="transition-colors hover:text-coral">
                      {c.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label="Bantuan">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-paper/45">
                Bantuan
              </p>
              <ul className="mt-3.5 space-y-2 text-[13px] font-medium text-paper/70">
                {HELP_LINKS.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="transition-colors hover:text-coral">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label="Legal dan akun">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-paper/45">
                Legal
              </p>
              <ul className="mt-3.5 space-y-2 text-[13px] font-medium text-paper/70">
                {LEGAL_LINKS.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="transition-colors hover:text-coral">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mb-1 mt-6 text-[11px] font-bold uppercase tracking-[0.14em] text-paper/45">
                Perusahaan
              </p>
              <ul className="mt-3.5 space-y-2 text-[13px] font-medium text-paper/70">
                {COMPANY_LINKS.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="transition-colors hover:text-coral">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-paper/15 pt-5 text-xs text-paper/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Tripora · Bandung Raya, Jawa Barat · IDR · Asia/Jakarta</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-medium">
            <span className="rounded-full border border-paper/15 px-2.5 py-1 text-[11px] text-paper/55">
              Mayar · QR e-ticket · Hold 10 mnt
            </span>
            <Link href="/syarat-ketentuan" className="hover:text-coral">Syarat</Link>
            <Link href="/kebijakan-refund" className="hover:text-coral">Kebijakan refund</Link>
            <Link href="/kebijakan-privasi" className="hover:text-coral">Privasi</Link>
            <Link href="#atas" className="hover:text-coral">Ke atas ↑</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

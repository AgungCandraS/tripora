"use client";
import { List, X, ArrowUpRight, Compass } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "./providers";

const navigation = [
  { href: "/explore", label: "Jelajahi tempat" },
  { href: "/activities", label: "Aktivitas & tiket" },
  { href: "/saved", label: "Tersimpan" },
  { href: "/my-trips", label: "Pesanan saya" },
];

export function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const button = useRef<HTMLButtonElement>(null);
  const transparent = overlay && !scrolled && !open;
  useEffect(() => {
    if (!overlay) return;
    const sync = () => setScrolled(window.scrollY > 60);
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    return () => window.removeEventListener("scroll", sync);
  }, [overlay]);
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    }
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [open]);
  return (
    <header
      className={`${overlay ? "fixed inset-x-0" : "sticky"} top-0 z-50 border-b transition-colors duration-300 ${transparent ? "hero-header border-white/20 text-white" : "border-line bg-paper/95 text-ink backdrop-blur-md"}`}
    >
      <div className="public-container flex h-[76px] items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-2.5"
          aria-label="Tripora beranda"
        >
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${transparent ? "border border-white/40 text-white" : "bg-moss text-paper"}`}
          >
            <Compass size={24} weight="light" />
          </span>
          <span className="text-2xl font-bold tracking-[-0.065em]">
            tripora
            <span className={transparent ? "text-cream" : "text-coral-dark"}>
              .
            </span>
          </span>
        </Link>
        <nav
          aria-label="Navigasi utama"
          className="hidden items-center gap-6 lg:flex"
        >
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className={`inline-flex min-h-11 items-center text-sm font-semibold transition-colors ${transparent ? "text-white/90 hover:text-white" : `hover:text-coral-dark ${pathname === item.href ? "text-coral-dark underline underline-offset-8" : "text-ink/70"}`}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-4 lg:flex">
          <span
            className={`text-xs ${transparent ? "text-white/80" : "text-ink/60"}`}
          >
            Bandung Raya
          </span>
          <Link
            href={user ? "/account" : "/auth/login"}
            className={transparent ? "hero-account-button" : "secondary-button"}
          >
            {loading ? "Akun" : user ? user.full_name.split(" ")[0] : "Masuk"}
            <ArrowUpRight size={16} />
          </Link>
        </div>
        <button
          ref={button}
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? "Tutup menu" : "Buka menu"}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          className={`flex h-11 w-11 items-center justify-center rounded-xl border lg:hidden ${transparent ? "border-white/40" : "border-line"}`}
        >
          {open ? <X size={23} /> : <List size={23} />}
        </button>
      </div>
      {open && (
        <nav
          id="mobile-navigation"
          aria-label="Navigasi mobile"
          className="border-t border-line px-5 py-4 lg:hidden"
        >
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex min-h-12 items-center justify-between rounded-lg px-3 font-semibold hover:bg-soft"
            >
              {item.label}
              <ArrowUpRight size={18} />
            </Link>
          ))}
          <Link
            href={user ? "/account" : "/auth/login"}
            className="primary-button mt-3 w-full"
          >
            {user ? "Buka akun saya" : "Masuk ke akun"}
          </Link>
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-ink text-paper">
      <div className="public-container py-12 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-[1.3fr_1fr_1fr]">
          <div>
            <Link href="/" className="text-3xl font-bold tracking-[-0.06em]">
              tripora<span className="text-coral">.</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-7 text-paper/75">
              Panduan wisata, kuliner, dan aktivitas lokal untuk perjalanan Anda
              di Bandung Raya.
            </p>
            <p className="mt-5 text-xs text-paper/65">
              Bandung, Jawa Barat · Indonesia
            </p>
          </div>
          <nav aria-label="Jelajahi">
            <h2 className="text-xs font-bold uppercase tracking-widest text-paper/60">
              Mulai dari sini
            </h2>
            <ul className="mt-4 space-y-1">
              {[
                ...navigation,
                { href: "/vendor/onboarding", label: "Jadi mitra lokal" },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="inline-flex min-h-9 items-center text-sm text-paper/85 hover:text-coral"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Informasi">
            <h2 className="text-xs font-bold uppercase tracking-widest text-paper/60">
              Tentang & bantuan
            </h2>
            <ul className="mt-4 space-y-1">
              {[
                { href: "/tentang-kami", label: "Tentang Tripora" },
                { href: "/bantuan", label: "Pusat bantuan" },
                { href: "/kebijakan-refund", label: "Kebijakan pembatalan" },
                { href: "/syarat-ketentuan", label: "Syarat & ketentuan" },
                { href: "/kebijakan-privasi", label: "Privasi" },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="inline-flex min-h-9 items-center text-sm text-paper/85 hover:text-coral"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="mt-10 flex flex-wrap justify-between gap-3 border-t border-paper/20 pt-5 text-xs text-paper/65">
          <p>© {new Date().getFullYear()} Tripora</p>
          <p>Informasi tempat dapat berubah. Konfirmasi sebelum berangkat.</p>
        </div>
      </div>
    </footer>
  );
}

"use client";

import {
  Bank,
  CalendarBlank,
  ChartBar,
  ChartLineUp,
  CheckCircle,
  ClipboardText,
  Compass,
  Gear,
  Lifebuoy,
  List,
  Megaphone,
  Money,
  Newspaper,
  Receipt,
  Scroll,
  SignOut,
  Star,
  Storefront,
  Ticket,
  User,
  UsersThree,
  Wallet,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./providers";

type Role = "customer" | "vendor" | "staff" | "admin";

const navigation = {
  customer: [
    { href: "/account", label: "Ringkasan", icon: ChartLineUp },
    { href: "/account/trips", label: "Perjalanan", icon: Ticket },
    { href: "/account/wishlist", label: "Favorit", icon: Compass },
    { href: "/account/reviews", label: "Ulasan", icon: Newspaper },
    { href: "/account/profile", label: "Profil", icon: User },
    { href: "/account/bantuan", label: "Bantuan", icon: Lifebuoy },
  ],
  vendor: [
    { href: "/vendor", label: "Ringkasan", icon: ChartLineUp },
    { href: "/vendor/onboarding", label: "Onboarding", icon: Storefront },
    { href: "/vendor/activities", label: "Aktivitas", icon: Compass },
    { href: "/vendor/schedules", label: "Jadwal", icon: CalendarBlank },
    { href: "/vendor/bookings", label: "Booking", icon: Ticket },
    { href: "/vendor/check-in", label: "Check-in", icon: CheckCircle },
    { href: "/vendor/revenue", label: "Pendapatan", icon: Money },
    { href: "/vendor/payouts", label: "Payout", icon: Wallet },
    { href: "/vendor/promos", label: "Promo", icon: Megaphone },
    { href: "/vendor/staff", label: "Staff", icon: UsersThree },
    { href: "/vendor/reviews", label: "Ulasan", icon: Star },
    { href: "/vendor/profile", label: "Profil", icon: User },
    { href: "/vendor/settings", label: "Pengaturan", icon: Gear },
    { href: "/vendor/bantuan", label: "Bantuan", icon: Lifebuoy },
  ],
  staff: [
    { href: "/staff", label: "Jadwal hari ini", icon: CalendarBlank },
    { href: "/staff/bookings", label: "Booking", icon: Ticket },
    { href: "/staff/check-in", label: "Scan tiket", icon: CheckCircle },
    { href: "/staff/verify", label: "Verifikasi", icon: ClipboardText },
    { href: "/staff/profile", label: "Profil", icon: User },
    { href: "/staff/bantuan", label: "Bantuan", icon: Lifebuoy },
  ],
  admin: [
    { href: "/admin", label: "Ringkasan", icon: ChartLineUp },
    { href: "/admin/vendors", label: "Vendor", icon: Storefront },
    { href: "/admin/verification", label: "Verifikasi", icon: ClipboardText },
    { href: "/admin/listings", label: "Listing", icon: Compass },
    { href: "/admin/categories", label: "Kategori", icon: Compass },
    { href: "/admin/bookings", label: "Booking", icon: Ticket },
    { href: "/admin/transactions", label: "Transaksi", icon: Money },
    { href: "/admin/refunds", label: "Refund", icon: Receipt },
    { href: "/admin/payouts", label: "Payout", icon: Bank },
    { href: "/admin/promos", label: "Promo", icon: Megaphone },
    { href: "/admin/reviews", label: "Ulasan", icon: Star },
    { href: "/admin/users", label: "Pengguna", icon: UsersThree },
    { href: "/admin/cms", label: "CMS", icon: Newspaper },
    { href: "/admin/reports", label: "Laporan", icon: ChartBar },
    { href: "/admin/risk", label: "Risiko", icon: WarningCircle },
    { href: "/admin/audit", label: "Audit log", icon: Scroll },
    { href: "/admin/profile", label: "Profil", icon: User },
    { href: "/admin/settings", label: "Pengaturan", icon: Gear },
    { href: "/admin/bantuan", label: "Bantuan", icon: Lifebuoy },
  ],
};

const roleLabel = {
  customer: "Akun pribadi",
  vendor: "Operasional mitra",
  staff: "Staff lapangan",
  admin: "Administrasi",
};

const roleBadge: Record<Role, string> = {
  customer: "bg-sage text-moss",
  vendor: "bg-paper/15 text-paper",
  staff: "bg-cream text-ink",
  admin: "bg-coral text-ink",
};

export function WorkspaceShell({
  role,
  current,
  children,
}: {
  role: Role;
  current: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const sidebar = sidebarRef.current;
    const controls = () =>
      Array.from(
        sidebar?.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled])",
        ) ?? [],
      );
    controls()[0]?.focus();
    function keyboard(event: KeyboardEvent) {
      if (window.matchMedia("(min-width: 1024px)").matches) return;
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
      if (event.key === "Tab") {
        const all = controls();
        const first = all[0];
        const last = all[all.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", keyboard);
    return () => document.removeEventListener("keydown", keyboard);
  }, [open]);
  const { user, loading, logout, hasRole } = useAuth();
  const items = navigation[role];

  const required: Record<Role, string[]> = {
    customer: ["CUSTOMER", "VENDOR_OWNER", "VENDOR_STAFF", "ADMIN"],
    vendor: ["VENDOR_OWNER", "ADMIN"],
    staff: ["VENDOR_STAFF", "VENDOR_OWNER", "ADMIN"],
    admin: ["ADMIN"],
  };

  if (loading) {
    return (
      <div
        className="min-h-[100dvh] bg-soft px-5 py-16"
        aria-busy="true"
        aria-label="Memuat workspace"
      >
        <div className="mx-auto max-w-[1120px] animate-pulse space-y-4">
          <div className="h-8 w-1/3 rounded-[10px] bg-line" />
          <div className="h-40 rounded-[16px] bg-paper" />
          <div className="h-64 rounded-[16px] bg-paper" />
        </div>
      </div>
    );
  }

  if (!user || !hasRole(...required[role])) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-soft px-5">
        <div className="w-full max-w-[440px] rounded-[16px] border border-line bg-paper p-8 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-coral-dark">
            {roleLabel[role]} · akses dibatasi
          </p>
          <h1 className="mt-3 text-2xl font-bold tracking-[-0.03em]">
            {!user
              ? "Masuk dulu untuk membuka workspace."
              : "Role-mu tidak punya akses ke sini."}
          </h1>
          <p className="mt-3 text-sm leading-6 text-ink/60">
            {!user
              ? "Masuk dengan akunmu untuk melihat pesanan atau mengelola aktivitas."
              : "Akun ini belum memiliki akses. Hubungi pengelola jika aksesmu perlu diperbarui."}
          </p>
          <Link
            href={
              user
                ? "/account"
                : `/auth/login?next=${encodeURIComponent(current)}`
            }
            className="mt-6 inline-flex w-full items-center justify-center rounded-[10px] bg-ink px-5 py-3.5 text-sm font-bold text-paper"
          >
            {!user ? "Masuk" : "Buka akun saya"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace min-h-[100dvh] bg-soft text-ink">
      <aside
        ref={sidebarRef}
        id="workspace-navigation"
        className={`fixed inset-y-0 left-0 z-30 w-[264px] flex-col border-r border-ink bg-ink text-paper p-5 ${open ? "flex" : "hidden lg:flex"}`}
      >
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5"
            onClick={() => setOpen(false)}
            aria-label="Tripora beranda"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-ink text-lg font-black text-paper">
              t
            </span>
            <span className="text-[21px] font-bold tracking-[-0.06em]">
              tripora
            </span>
          </Link>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Tutup sidebar"
          >
            <X size={20} />
          </button>
        </div>
        <div className="mt-6 flex items-center justify-between px-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-paper/65">
            {roleLabel[role]}
          </p>
          <span
            className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${roleBadge[role]}`}
          >
            {role}
          </span>
        </div>
        <nav
          className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto pr-0.5"
          aria-label="Navigasi workspace"
        >
          {items.map(({ href, label, icon: Icon }) => {
            const active =
              current === href ||
              (href.split("/").length > 2 && current.startsWith(`${href}/`));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-[10px] px-3 py-3 text-sm font-semibold transition ${
                  active
                    ? "bg-sage text-ink"
                    : "text-paper/75 hover:bg-paper/10 hover:text-paper"
                }`}
              >
                <Icon size={18} weight={active ? "fill" : "regular"} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto rounded-[12px] border border-line bg-paper/5 border-paper/20 p-4">
          <p className="truncate text-xs font-bold" title={user.full_name}>
            {user.full_name}
          </p>
          <p className="mt-0.5 truncate font-mono text-[11px] text-paper/65">
            {user.email}
          </p>
          <button
            type="button"
            onClick={logout}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-paper/10 px-3 py-2.5 text-xs font-bold hover:bg-paper/20"
          >
            <SignOut size={15} /> Keluar
          </button>
        </div>
      </aside>

      {open && (
        <button
          aria-label="Tutup menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-20 bg-ink/40 lg:hidden"
        />
      )}

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between gap-3 border-b border-line bg-paper/90 px-5 backdrop-blur-md sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              ref={toggleRef}
              className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-line lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Buka sidebar"
              aria-expanded={open}
              aria-controls="workspace-navigation"
            >
              <List size={20} />
            </button>
            <p className="hidden text-sm font-semibold text-ink/55 sm:block">
              {items.find((item) => item.href === current)?.label ??
                roleLabel[role]}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden h-10 items-center rounded-[10px] bg-ink px-4 text-sm font-bold text-paper sm:inline-flex">
              {user.full_name.split(" ")[0]}
            </span>
          </div>
        </header>
        <main
          id="content"
          className="workspace-content mx-auto max-w-[1320px] px-5 py-8 sm:px-8 sm:py-10"
        >
          <WorkspaceQueryErrors />
          {children}
        </main>
      </div>
    </div>
  );
}

function WorkspaceQueryErrors() {
  const client = useQueryClient();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const sync = () =>
      setFailed(
        client
          .getQueryCache()
          .getAll()
          .some((query) => query.isActive() && query.state.status === "error"),
      );
    sync();
    return client.getQueryCache().subscribe(sync);
  }, [client]);
  if (!failed) return null;
  return (
    <div
      role="alert"
      className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-coral-dark/25 bg-white px-5 py-4"
    >
      <p className="text-sm font-semibold text-coral-dark">
        Sebagian data belum bisa dimuat. Angka kosong belum menggambarkan data
        sebenarnya.
      </p>
      <button
        type="button"
        onClick={() =>
          client.refetchQueries({
            predicate: (query) =>
              query.isActive() && query.state.status === "error",
          })
        }
        className="secondary-button"
      >
        Coba lagi
      </button>
    </div>
  );
}

export function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div data-motion className="rounded-[12px] border border-line bg-white p-5">
      <p className="text-xs font-semibold text-ink/50">{label}</p>
      <p className="mt-2.5 text-3xl font-bold tracking-[-0.04em]">{value}</p>
      <p className="mt-1.5 text-xs text-ink/65">{hint}</p>
    </div>
  );
}

export function WorkspaceHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div data-motion className="border-b border-line pb-7">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-coral-dark">
        {eyebrow}
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-[-0.05em] sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 max-w-[620px] text-sm leading-6 text-ink/60">
        {description}
      </p>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const s = status.toUpperCase();
  const tone = [
    "CONFIRMED",
    "APPROVED",
    "PAID",
    "COMPLETED",
    "ACTIVE",
    "PUBLISHED",
    "PROCESSED",
    "ISSUED",
    "CHECKED_IN",
    "RELEASED",
    "SENT",
  ].includes(s)
    ? "bg-sage text-moss"
    : [
          "PENDING_PAYMENT",
          "PENDING",
          "IN_REVIEW",
          "REVIEW",
          "REFUND_PENDING",
          "QUEUED",
        ].includes(s)
      ? "bg-[#f6d9c8] text-[#8a3a20]"
      : "bg-soft text-ink/60";
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${tone}`}
    >
      <span
        className="h-1.5 w-1.5 rounded-full bg-current"
        aria-hidden="true"
      />
      {(
        {
          PENDING_PAYMENT: "Menunggu pembayaran",
          PENDING: "Menunggu",
          CONFIRMED: "Dikonfirmasi",
          PAID: "Lunas",
          COMPLETED: "Selesai",
          CHECKED_IN: "Sudah check-in",
          CANCELLED: "Dibatalkan",
          EXPIRED: "Kedaluwarsa",
          REFUND_PENDING: "Proses pengembalian",
          REFUNDED: "Dana dikembalikan",
          APPROVED: "Disetujui",
          REJECTED: "Ditolak",
          PROCESSED: "Diproses",
          ACTIVE: "Aktif",
          PUBLISHED: "Terbit",
          DRAFT: "Draf",
          QUEUED: "Antrean",
          SENT: "Terkirim",
        } as Record<string, string>
      )[s] ?? status.replace(/_/g, " ")}
    </span>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarBlank,
  Clock,
  Heart,
  MapPin,
  Minus,
  Plus,
  ShieldCheck,
  Star,
  UsersThree,
} from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { api, formatIDR } from "../lib/api";
import {
  durationText,
  imageFor,
  minutesText,
  ratingText,
  type ApiActivity,
  type ApiSlot,
} from "../lib/types";
import { useAuth } from "./providers";

interface AvailabilityResponse {
  packageId: string;
  date: string;
  slots: ApiSlot[];
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ActivityDetailClient({ activity }: { activity: ApiActivity }) {
  const { authenticated, token } = useAuth();
  const [saved, setSaved] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const packages = activity.packages ?? [];
  const [packageIndex, setPackageIndex] = useState(0);
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO());
  const [guests, setGuests] = useState(() =>
    Math.max(
      packages[0]?.min_participants ?? 1,
      Math.min(2, packages[0]?.max_participants ?? 2),
    ),
  );
  const [saveError, setSaveError] = useState("");
  const selected = packages[packageIndex];
  useEffect(() => {
    if (selected)
      setGuests((value) =>
        Math.max(
          selected.min_participants,
          Math.min(selected.max_participants, value),
        ),
      );
  }, [selected]);
  const category = activity.categories?.[0]?.category.name ?? "Aktivitas";

  const availability = useQuery({
    queryKey: ["availability", selected?.id, date],
    queryFn: () =>
      api.get<AvailabilityResponse>(
        `/packages/${selected.id}/availability?date=${date}`,
      ),
    enabled: Boolean(selected?.id) && Boolean(date),
    staleTime: 15 * 1000,
  });

  const slots = availability.data?.slots ?? [];
  const activeSlot =
    slots.find((s) => s.scheduleId === scheduleId) ??
    slots.find(
      (s) =>
        !s.soldOut &&
        s.available >= guests &&
        !s.blackout &&
        !s.past &&
        !s.cutoffReached,
    ) ??
    null;
  const effectiveScheduleId = activeSlot?.scheduleId ?? null;

  const checkoutHref = useMemo(() => {
    const params = new URLSearchParams({
      package: selected?.id ?? "",
      slot: effectiveScheduleId ?? "",
      guests: String(guests),
    });
    if (date) params.set("date", date);
    return `/checkout?${params.toString()}`;
  }, [selected?.id, date, guests, effectiveScheduleId]);

  const canBook =
    Boolean(selected) &&
    Boolean(date) &&
    Boolean(effectiveScheduleId) &&
    !availability.isFetching &&
    !availability.isError &&
    Boolean(
      activeSlot &&
        activeSlot.available >= guests &&
        !activeSlot.soldOut &&
        !activeSlot.blackout &&
        !activeSlot.past &&
        !activeSlot.cutoffReached,
    ) &&
    guests >= (selected?.min_participants ?? 1) &&
    guests <= (selected?.max_participants ?? 0);

  return (
    <section
      id="content"
      className="mx-auto max-w-[1400px] px-5 pb-24 pt-8 sm:px-8 lg:px-12"
    >
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink/45"
      >
        <Link href="/explore" className="hover:text-ink">
          Explore
        </Link>
        <span>/</span>
        {activity.destination && (
          <>
            <Link
              href={`/destinations/${activity.destination.slug}`}
              className="hover:text-ink"
            >
              {activity.destination.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-ink">{activity.title}</span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="relative aspect-[1.18] overflow-hidden rounded-[16px] bg-sage">
            <Image
              src={imageFor(activity)}
              alt={activity.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="object-cover"
            />
            <span className="absolute left-4 top-4 rounded-full bg-ink/75 px-3 py-1.5 text-[11px] font-bold text-paper backdrop-blur-sm">
              {category} · {activity.destination?.name ?? ""}
            </span>
          </div>

          <div className="mt-8 max-w-[680px]">
            {activity.rating_count > 0 && (
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-coral-dark">
                <Star size={14} weight="fill" /> {ratingText(activity)} ·{" "}
                {activity.rating_count} ulasan
                {activity.vendor ? ` · ${activity.vendor.name}` : ""}
              </p>
            )}
            <h1 className="editorial-title mt-3 text-4xl sm:text-5xl">
              {activity.title}
            </h1>
            <p className="mt-5 text-base leading-7 text-ink/65">
              {activity.description}
            </p>

            <div className="mt-7 grid gap-4 border-y border-line py-5 sm:grid-cols-3">
              {[
                { icon: Clock, l: "Durasi", v: durationText(activity) },
                {
                  icon: MapPin,
                  l: "Meeting point",
                  v:
                    activity.meeting_point ?? activity.destination?.name ?? "-",
                },
                {
                  icon: UsersThree,
                  l: "Grup",
                  v: selected
                    ? `${selected.min_participants}–${selected.max_participants} peserta`
                    : "-",
                },
              ].map(({ icon: Icon, l, v }) => (
                <div key={l} className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-soft text-coral-dark">
                    <Icon size={19} />
                  </span>
                  <div>
                    <p className="text-xs text-ink/50">{l}</p>
                    <p className="mt-0.5 text-sm font-bold">{v}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-[12px] border border-line bg-paper p-5">
              <p className="flex items-center gap-2 text-sm font-bold">
                <ShieldCheck size={18} className="text-moss" /> Kebijakan
                booking
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/60">
                <li>· Hold 10 menit — lewat dari itu slot dilepas otomatis.</li>
                <li>
                  · Refund: &gt;7 hari 100% · 3–7 hari 50% · &lt;3 hari
                  non-refundable.
                </li>
                <li>
                  · Tunjukkan QR tiket saat check-in.
                  {activity.min_age
                    ? ` Minimum usia ${activity.min_age} tahun.`
                    : ""}
                </li>
              </ul>
            </div>
          </div>
        </motion.div>

        <motion.aside
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="h-fit rounded-[16px] border border-line bg-white p-5 shadow-[0_16px_45px_rgba(16,35,30,0.08)] sm:p-6 lg:sticky lg:top-24"
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-coral-dark">
            Atur pengalaman
          </p>
          <h2 className="mt-2 text-xl font-bold">Pilih paket & slot</h2>

          {packages.length === 0 ? (
            <p className="mt-5 rounded-[10px] bg-soft px-4 py-3.5 text-sm text-ink/60">
              Paket belum tersedia untuk aktivitas ini.
            </p>
          ) : (
            <div
              className="mt-5 space-y-2.5"
              role="radiogroup"
              aria-label="Pilih paket"
            >
              {packages.map((item, index) => {
                const activePkg = packageIndex === index;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={activePkg}
                    onClick={() => {
                      setPackageIndex(index);
                      setScheduleId(null);
                    }}
                    className={`w-full rounded-[12px] border p-4 text-left transition ${
                      activePkg
                        ? "border-ink bg-ink text-paper"
                        : "border-line hover:border-ink/40"
                    }`}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span>
                        <span className="block font-bold">{item.name}</span>
                        <span
                          className={`mt-1 block text-xs ${activePkg ? "text-paper/60" : "text-ink/55"}`}
                        >
                          {minutesText(item.duration_minutes)}
                        </span>
                      </span>
                      <span className="text-sm font-bold">
                        {formatIDR(item.base_price)}
                      </span>
                    </span>
                    {item.description && (
                      <span
                        className={`mt-2 block text-xs leading-5 ${activePkg ? "text-paper/60" : "text-ink/55"}`}
                      >
                        {item.description}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <label className="flex items-center gap-3 rounded-[10px] border border-line px-3 py-3">
              <CalendarBlank size={19} className="shrink-0 text-coral-dark" />
              <span className="flex-1">
                <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-ink/45">
                  Tanggal
                </span>
                <input
                  type="date"
                  value={date}
                  min={todayISO()}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setScheduleId(null);
                  }}
                  className="mt-1 w-full bg-transparent text-sm font-semibold outline-none"
                />
              </span>
            </label>
            <div className="flex items-center gap-3 rounded-[10px] border border-line px-3 py-3">
              <UsersThree size={19} className="shrink-0 text-coral-dark" />
              <span className="flex-1">
                <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-ink/45">
                  Peserta
                </span>
                <span className="mt-1 flex items-center gap-3">
                  <button
                    type="button"
                    aria-label="Kurangi peserta"
                    onClick={() =>
                      setGuests((g) =>
                        Math.max(selected?.min_participants ?? 1, g - 1),
                      )
                    }
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-line hover:border-ink/40"
                  >
                    <Minus size={14} weight="bold" />
                  </button>
                  <span className="min-w-14 text-center text-sm font-bold">
                    {guests} orang
                  </span>
                  <button
                    type="button"
                    aria-label="Tambah peserta"
                    onClick={() =>
                      setGuests((g) =>
                        Math.min(selected?.max_participants ?? 20, g + 1),
                      )
                    }
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-line hover:border-ink/40"
                  >
                    <Plus size={14} weight="bold" />
                  </button>
                </span>
              </span>
            </div>
          </div>

          <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-ink/45">
            Time slot · availability live
          </p>
          {availability.isLoading ? (
            <div
              className="mt-2.5 grid grid-cols-2 gap-2"
              aria-busy="true"
              aria-label="Memuat slot"
            >
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-[68px] animate-pulse rounded-[10px] bg-soft"
                />
              ))}
            </div>
          ) : availability.isError || !selected ? (
            <p className="mt-2.5 rounded-[10px] bg-soft px-4 py-3.5 text-xs leading-5 text-ink/60">
              Slot tidak bisa dimuat.{" "}
              {availability.isError
                ? "Pastikan tanggal valid lalu coba lagi."
                : "Pilih paket dulu."}
            </p>
          ) : slots.length === 0 ? (
            <p className="mt-2.5 rounded-[10px] bg-soft px-4 py-3.5 text-xs leading-5 text-ink/60">
              Tidak ada jadwal pada tanggal ini. Coba tanggal lain.
            </p>
          ) : (
            <div
              className="mt-2.5 grid grid-cols-2 gap-2"
              role="radiogroup"
              aria-label="Pilih slot"
            >
              {slots.map((s) => {
                const blocked =
                  s.soldOut ||
                  s.available < guests ||
                  s.blackout ||
                  s.past ||
                  s.cutoffReached;
                const isActive = effectiveScheduleId === s.scheduleId;
                const label = s.blackout
                  ? "Tutup"
                  : s.past
                    ? "Lewat"
                    : s.cutoffReached
                      ? "Cutoff"
                      : s.soldOut
                        ? "Penuh"
                        : s.available < guests
                          ? `Sisa ${s.available}`
                          : `${s.available} slot`;
                return (
                  <button
                    key={s.scheduleId}
                    type="button"
                    disabled={blocked}
                    role="radio"
                    aria-checked={isActive}
                    aria-label={`${s.slot} · ${label}`}
                    onClick={() => setScheduleId(s.scheduleId)}
                    className={`rounded-[10px] border px-3 py-3 text-left transition ${
                      isActive
                        ? "border-ink bg-ink text-paper"
                        : blocked
                          ? "cursor-not-allowed border-line bg-soft/60 text-ink/35"
                          : "border-line hover:border-ink/40"
                    }`}
                  >
                    <span className="block text-sm font-bold">{s.slot}</span>
                    <span
                      className={`mt-0.5 block text-[11px] font-semibold ${isActive ? "text-paper/60" : blocked ? "text-ink/35" : s.available <= 2 ? "text-coral-dark" : "text-moss"}`}
                    >
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-6 flex items-end justify-between border-t border-line pt-5">
            <div>
              <p className="text-xs text-ink/50">Mulai dari</p>
              <p className="mt-1 text-xl font-bold">
                {selected ? formatIDR(selected.base_price) : "-"}
              </p>
              <p className="mt-0.5 text-[11px] text-ink/45">
                {guests} peserta{activeSlot ? ` · ${activeSlot.slot}` : ""}
                {date ? ` · ${date}` : ""}
              </p>
            </div>
            {canBook ? (
              <Link
                href={checkoutHref}
                className="inline-flex items-center gap-2 rounded-[10px] bg-coral px-4 py-3 text-sm font-bold text-ink transition hover:bg-[#ed8c6b]"
              >
                Lanjut booking <ArrowRight size={16} weight="bold" />
              </Link>
            ) : (
              <span className="inline-flex cursor-not-allowed items-center gap-2 rounded-[10px] bg-soft px-4 py-3 text-sm font-bold text-ink/40">
                Pilih slot <ArrowRight size={16} weight="bold" />
              </span>
            )}
          </div>
          <p className="mt-4 text-xs leading-5 text-ink/50">
            Slot ditahan 10 menit saat checkout. Harga final & ketersediaan
            dikonfirmasi saat pesanan dibuat.
          </p>
          {saveError && (
            <p role="alert" className="mt-3 text-sm text-coral-dark">
              {saveError}
            </p>
          )}
          {authenticated && (
            <button
              type="button"
              disabled={saveBusy || saved}
              onClick={async () => {
                setSaveBusy(true);
                setSaveError("");
                try {
                  await api.post(`/me/wishlist/${activity.id}`, {}, token);
                  setSaved(true);
                } catch {
                  setSaveError("Belum bisa menyimpan. Coba lagi.");
                } finally {
                  setSaveBusy(false);
                }
              }}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[10px] border border-line px-4 py-3 text-sm font-bold hover:border-ink/40 disabled:opacity-60"
            >
              <Heart
                size={17}
                weight={saved ? "fill" : "regular"}
                className="text-coral-dark"
              />
              {saved
                ? "Tersimpan di wishlist"
                : saveBusy
                  ? "Menyimpan…"
                  : "Simpan ke wishlist"}
            </button>
          )}
        </motion.aside>
      </div>

      {canBook && selected && (
        <div className="sticky bottom-4 mt-8 lg:hidden">
          <Link
            href={checkoutHref}
            className="flex items-center justify-between rounded-[12px] bg-ink px-5 py-4 text-paper shadow-[0_16px_40px_rgba(16,35,30,0.3)]"
          >
            <span>
              <span className="block text-[11px] text-paper/55">
                {formatIDR(selected.base_price)} · {activeSlot?.slot}
              </span>
              <span className="block text-sm font-bold">Lanjut booking →</span>
            </span>
            <ArrowRight size={20} weight="bold" className="text-coral" />
          </Link>
        </div>
      )}
    </section>
  );
}

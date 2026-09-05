"use client";

import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  LockKey,
  ShieldCheck,
  Tag,
  Ticket,
  Timer,
} from "@phosphor-icons/react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ApiError, api, formatIDR, getSessionId } from "../lib/api";
import type { ApiBooking, ApiPackage } from "../lib/types";
import { TicketCard } from "./ticket-card";

const STEPS = ["Detail guest", "Voucher", "Pembayaran", "E-ticket"];
const FEE = 5000;

interface PackageDetail extends ApiPackage {
  activity: {
    id: string;
    title: string;
    slug: string;
    vendor?: { name: string };
    destination?: { name: string };
  };
}

interface ReservationResult {
  reservationId: string;
  publicToken: string;
  expiresAt: string;
}

interface BookingResult {
  booking_code: string;
  status: string;
  total_amount: number;
  subtotal: number;
  discount_amount: number;
  platform_fee: number;
}

function errMsg(e: unknown): { code: string; message: string } {
  if (e instanceof ApiError) {
    if (e.status === 429) return { code: "RATE_LIMITED", message: "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi." };
    return { code: e.code, message: e.message };
  }
  return { code: "REQUEST_FAILED", message: "Jaringan bermasalah. Coba lagi." };
}

export function CheckoutClient({
  packageId,
  scheduleId,
  date,
  guests,
}: {
  packageId: string;
  scheduleId: string;
  date: string;
  guests: number;
}) {
  const pkgQuery = useQuery({
    queryKey: ["package", packageId],
    queryFn: () => api.get<PackageDetail>(`/packages/${packageId}`),
    enabled: Boolean(packageId),
    retry: 1,
  });
  const pkg = pkgQuery.data ?? null;

  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [fatal, setFatal] = useState<{ code: string; message: string } | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [extraNames, setExtraNames] = useState("");
  const [touched, setTouched] = useState(false);

  const [voucherInput, setVoucherInput] = useState("");
  const [voucher, setVoucher] = useState<string | null>(null);

  const [working, setWorking] = useState<"idle" | "holding" | "booking" | "paying">("idle");

  const [reservation, setReservation] = useState<ReservationResult | null>(null);
  const [booking, setBooking] = useState<BookingResult | null>(null);
  const [duplicateCode, setDuplicateCode] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ subtotal: number; discount_amount: number; platform_fee: number; total_amount: number } | null>(null);
  const [confirmed, setConfirmed] = useState<(ApiBooking & { ticketToken?: string | null }) | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const expiresMs = reservation ? new Date(reservation.expiresAt).getTime() : 0;
  useEffect(() => {
    if (!reservation || confirmed) return;
    const t = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [reservation, confirmed]);

  const secondsLeft = reservation ? Math.max(0, Math.floor((expiresMs - nowMs) / 1000)) : 0;
  const expired = Boolean(reservation) && !confirmed && secondsLeft <= 0;
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  // Polling status pembayaran via lookup publik (bukti guest = kode + email).
  useEffect(() => {
    if (!booking || confirmed || expired) return;
    let alive = true;
    const tick = async () => {
      try {
        const found = await api.post<ApiBooking & { ticketToken?: string | null }>(
          "/booking-lookup",
          { bookingCode: booking.booking_code, emailOrPhone: email },
          null
        );
        if (!alive) return;
        if (found.status === "CONFIRMED" || found.status === "PAID") {
          setConfirmed(found);
          try {
            window.sessionStorage.setItem("tripora_last_booking", JSON.stringify({ code: found.booking_code, email }));
          } catch { /* abaikan */ }
        }
      } catch { /* tetap polling */ }
    };
    void tick();
    const t = window.setInterval(tick, 5000);
    return () => { alive = false; window.clearInterval(t); };
  }, [booking, confirmed, expired, email]);

  const nameOk = name.trim().length >= 3;
  // Server-side price preview (PRD §35): backend final, bukan hitungan lokal.
  useEffect(() => {
    if (step !== 2 || !reservation || !pkg) return;
    let alive = true;
    setPreview(null);
    api.post<{ subtotal: number; discount_amount: number; platform_fee: number; total_amount: number }>(
      "/bookings/price-preview",
      { packageId, scheduleId, date, participants: guests, promotionCode: voucher || null },
      null
    ).then((p) => { if (alive) setPreview(p); }).catch(() => { /* fallback ke estimasi lokal */ });
    return () => { alive = false; };
  }, [step, reservation, pkg, packageId, scheduleId, date, guests, voucher]);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const phoneOk = /^08[0-9]{8,12}$/.test(phone.trim());
  const detailOk = nameOk && emailOk && phoneOk;

  const estimate = useMemo(() => {
    const unit = pkg?.base_price ?? 0;
    const subtotal = unit * guests;
    return { unit, subtotal, total: subtotal + FEE };
  }, [pkg, guests]);

  function go(next: number) {
    const clamped = Math.max(0, Math.min(3, next));
    if (clamped <= maxStep || clamped === step + 1) {
      setStep(clamped);
      setMaxStep((m) => Math.max(m, clamped));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function holdSlot() {
    if (!detailOk) {
      setTouched(true);
      return;
    }
    setWorking("holding");
    setFatal(null);
    try {
      const res = await api.post<ReservationResult>("/reservations", {
        packageId,
        scheduleId,
        date,
        participants: guests,
        sessionId: getSessionId(),
      }, null);
      setReservation(res);
      go(1);
    } catch (e) {
      const err = errMsg(e);
      if (err.code === "SLOT_NOT_AVAILABLE" || err.code === "RESERVATION_EXPIRED" || err.code === "NOT_FOUND") {
        setFatal({ code: err.code, message: "Slot tidak lagi tersedia. Pilih tanggal atau slot lain." });
      } else if (["BOOKING_DATE_IN_PAST", "SLOT_IN_PAST", "BOOKING_CUTOFF_REACHED", "INVALID_QUANTITY"].includes(err.code)) {
        setFatal({ code: err.code, message: `${err.message} Pilih tanggal atau slot lain.` });
      } else {
        setFatal(err);
      }
    } finally {
      setWorking("idle");
    }
  }

  async function pay() {
    if (!reservation || working !== "idle" || expired) return;
    setWorking("booking");
    setFatal(null);
    try {
      const participants = extraNames
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, guests)
        .map((n) => ({ name: n }));
      const bk = await api.post<BookingResult>("/bookings", {
        reservationId: reservation.reservationId,
        booker: { name: name.trim(), email: email.trim(), phone: phone.trim() },
        participants,
        promotionCode: voucher || null,
        sessionId: getSessionId(),
      }, null);
      setBooking(bk);
      setWorking("paying");
      try {
        const pay = await api.post<{ paymentUrl: string }>("/payments", { bookingCode: bk.booking_code }, null);
        window.open(pay.paymentUrl, "_blank", "noopener");
      } catch (payErr) {
        // Mode demo tanpa API key: tetap lanjut ke layar tunggu — simulasi bayar tersedia di sana.
        if (process.env.NEXT_PUBLIC_DEMO_PAYMENTS !== "true") throw payErr;
      }
      go(3);
    } catch (e) {
      const err = errMsg(e);
      if (err.code === "INVALID_PROMOTION") {
        setVoucher(null);
        setStep(1);
        setFatal({ code: err.code, message: `Voucher ditolak backend: ${err.message}. Ganti atau lewati.` });
      } else if (err.code === "DUPLICATE_BOOKING_DETECTED") {
        const m = err.message.match(/TRP-[A-Z0-9-]+/);
        setDuplicateCode(m ? m[0] : null);
        setFatal({ code: err.code, message: "Kamu sudah punya booking belum-bayar yang sama. Lanjutkan pembayarannya atau batalkan dulu." });
      } else if (err.code === "TOO_MANY_ACTIVE_BOOKINGS") {
        setFatal({ code: err.code, message: "Kebanyakan booking belum-bayar. Selesaikan atau batalkan salah satu dulu." });
      } else if (["BOOKING_DATE_IN_PAST", "SLOT_IN_PAST", "BOOKING_CUTOFF_REACHED", "INVALID_QUANTITY"].includes(err.code)) {
        setFatal({ code: err.code, message: `${err.message} Pilih slot lain.` });
        setReservation(null);
        setStep(0);
        setMaxStep(0);
      } else if (err.code === "SLOT_NOT_AVAILABLE" || err.code === "RESERVATION_EXPIRED") {
        setFatal({ code: err.code, message: "Slot habis saat memproses. Reservation dilepas — pilih slot lain." });
        setReservation(null);
        setStep(0);
        setMaxStep(0);
      } else {
        setFatal(err);
      }
    } finally {
      setWorking("idle");
    }
  }

  /** PRD §84: lanjutkan pembayaran booking duplikat yang belum-bayar. */
  async function continueDuplicate() {
    if (!duplicateCode || working !== "idle") return;
    setWorking("paying");
    setFatal(null);
    try {
      const pay = await api.post<{ paymentUrl: string }>("/payments", { bookingCode: duplicateCode }, null);
      window.open(pay.paymentUrl, "_blank", "noopener");
      setBooking({ booking_code: duplicateCode, status: "PENDING_PAYMENT", total_amount: 0, subtotal: 0, discount_amount: 0, platform_fee: 0 });
      go(3);
    } catch (e) {
      setFatal(errMsg(e));
    } finally {
      setWorking("idle");
    }
  }

  /** PRD §84: batalkan booking duplikat lalu ulangi dari slot baru. */
  async function cancelDuplicate() {
    if (!duplicateCode || working !== "idle") return;
    setWorking("paying");
    setFatal(null);
    try {
      await api.post(`/bookings/${duplicateCode}/cancel`, { emailOrPhone: email.trim() }, null);
      setDuplicateCode(null);
      setReservation(null);
      setStep(0);
      setMaxStep(0);
      setFatal({ code: "CANCELLED", message: "Booking lama dibatalkan. Pilih slot baru untuk booking ulang." });
    } catch (e) {
      setFatal(errMsg(e));
    } finally {
      setWorking("idle");
    }
  }

  if (pkgQuery.isLoading) {
    return (
      <section className="mx-auto max-w-[1100px] animate-pulse px-5 pb-20 pt-8 sm:px-8" aria-busy="true" aria-label="Memuat paket">
        <div className="h-8 w-2/3 rounded-[10px] bg-soft" />
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="h-96 rounded-[16px] bg-soft" />
          <div className="h-96 rounded-[16px] bg-soft" />
        </div>
      </section>
    );
  }

  if (pkgQuery.isError || !pkg) {
    return (
      <section className="mx-auto max-w-[560px] px-5 py-16 text-center sm:px-8">
        <h1 className="display-text text-3xl font-bold tracking-[-0.045em]">Paket tidak ditemukan.</h1>
        <p className="mt-3 text-sm leading-6 text-ink/60">Pilih ulang paket dari halaman aktivitas. Pastikan backend jalan.</p>
        <Link href="/explore" className="mt-6 inline-flex rounded-[10px] bg-ink px-5 py-3.5 text-sm font-bold text-paper">
          Kembali explore
        </Link>
      </section>
    );
  }

  if (expired) {
    return (
      <section className="mx-auto max-w-[560px] px-5 py-16 text-center sm:px-8 sm:py-20">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f6d9c8] text-[#8a3a20]">
            <Timer size={28} weight="bold" />
          </span>
          <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.18em] text-coral-dark">Hold kedaluwarsa · EXPIRED</p>
          <h1 className="display-text mt-3 text-4xl font-bold tracking-[-0.05em]">Slot dilepas kembali.</h1>
          <p className="mx-auto mt-4 max-w-[420px] text-sm leading-6 text-ink/60">
            Reservation hold 10 menit habis — kapasitas dikembalikan. Ulangi dari detail untuk menahan slot baru.
          </p>
          <Link href="/explore" className="mt-7 inline-flex items-center gap-2 rounded-[10px] bg-ink px-5 py-3.5 text-sm font-bold text-paper">
            <ArrowLeft size={16} /> Pilih slot lagi
          </Link>
        </motion.div>
      </section>
    );
  }

  if (confirmed) {
    return (
      <section className="mx-auto max-w-[680px] px-5 py-12 sm:px-8">
        <motion.div initial={{ opacity: 0, scale: 0.96, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }} className="text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sage text-moss">
            <Check size={28} weight="bold" />
          </span>
          <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.18em] text-coral-dark">Pembayaran terverifikasi · CONFIRMED</p>
          <h1 className="display-text mx-auto mt-3 max-w-[520px] text-4xl font-bold tracking-[-0.05em]">E-ticket-mu terbit.</h1>
          <p className="mx-auto mt-3 max-w-[460px] text-sm leading-6 text-ink/60">
            Booking {confirmed.booking_code} dikonfirmasi backend setelah webhook Mayar terverifikasi.
          </p>
        </motion.div>
        <div className="mx-auto mt-8 max-w-[440px]">
          <TicketCard
            code={confirmed.booking_code}
            activity={confirmed.activity?.title ?? pkg.activity.title}
            pkg={`${confirmed.package?.name ?? ""}`}
            slot={confirmed.slot_start}
            date={confirmed.booking_date.slice(0, 10)}
            name={confirmed.booker_name}
            vendor={pkg.activity.vendor?.name ?? ""}
            meetingPoint={pkg.activity.title}
            token={confirmed.ticketToken}
          />
        </div>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href={`/booking/${confirmed.booking_code}`} className="inline-flex items-center gap-2 rounded-[10px] bg-ink px-5 py-3.5 text-sm font-bold text-paper">
            Buka konfirmasi <Ticket size={17} />
          </Link>
          <Link href="/my-trips" className="inline-flex items-center gap-2 rounded-[10px] border border-line px-5 py-3.5 text-sm font-bold hover:border-ink/40">
            My Trips
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-[1100px] px-5 pb-20 pt-8 sm:px-8 lg:px-12">
      <Link href="/explore" className="inline-flex items-center gap-2 text-sm font-bold text-coral-dark underline underline-offset-4">
        <ArrowLeft size={16} /> Kembali explore
      </Link>

      <ol className="mt-8 grid grid-cols-4 gap-2" aria-label="Langkah checkout">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button
              type="button"
              onClick={() => go(i)}
              disabled={i > maxStep || working !== "idle"}
              aria-current={step === i ? "step" : undefined}
              className="flex w-full flex-col gap-2 text-left disabled:cursor-default"
            >
              <span className={`h-1 rounded-full transition-colors ${i < step ? "bg-moss" : i === step ? "bg-coral" : "bg-line"}`} aria-hidden="true" />
              <span className={`flex items-center gap-1.5 text-[11px] font-bold sm:text-xs ${i === step ? "text-ink" : i < step ? "text-moss" : "text-ink/40"}`}>
                {i < step && <Check size={13} weight="bold" />}
                {i + 1}. {s}
              </span>
            </button>
          </li>
        ))}
      </ol>

      {fatal && (
        <p className="mt-6 rounded-[12px] bg-[#f6d9c8] px-4 py-3.5 text-sm font-semibold text-[#8a3a20]" role="alert">
          {fatal.message} <span className="font-mono text-xs">({fatal.code})</span>
        </p>
      )}

      {duplicateCode && (
        <div className="mt-4 flex flex-wrap gap-3" role="group" aria-label="Booking duplikat">
          <button
            type="button"
            onClick={continueDuplicate}
            disabled={working !== "idle"}
            className="inline-flex items-center gap-2 rounded-[10px] bg-ink px-5 py-3.5 text-sm font-bold text-paper transition hover:bg-moss disabled:opacity-60"
          >
            Lanjutkan pembayaran {duplicateCode}
          </button>
          <button
            type="button"
            onClick={cancelDuplicate}
            disabled={working !== "idle"}
            className="inline-flex items-center gap-2 rounded-[10px] border border-line px-5 py-3.5 text-sm font-bold hover:border-ink/40 disabled:opacity-60"
          >
            Batalkan booking lama
          </button>
        </div>
      )}

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_380px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-[16px] border border-line bg-paper p-5 sm:p-8"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-coral-dark">
                Langkah {step + 1} dari 4 · {STEPS[step]}
              </p>
              {reservation && (
                <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${secondsLeft > 60 ? "bg-soft text-ink" : "bg-[#f6d9c8] text-[#8a3a20]"}`}>
                  <Timer size={14} className="text-coral-dark" /> {mm}:{ss}
                </span>
              )}
            </div>

            {step === 0 && (
              <CheckoutDetailForm
                name={name} setName={setName} email={email} setEmail={setEmail}
                phone={phone} setPhone={setPhone} extraNames={extraNames} setExtraNames={setExtraNames}
                touched={touched} nameOk={nameOk} emailOk={emailOk} phoneOk={phoneOk}
                working={working === "holding"}
                onSubmit={holdSlot}
              />
            )}

            {step === 1 && (
              <div>
                <h1 className="display-text mt-2 text-3xl font-bold tracking-[-0.045em]">Punya voucher?</h1>
                <p className="mt-2 text-sm leading-6 text-ink/60">Opsional — lewati jika tidak ada. Validasi final oleh backend saat booking dibuat.</p>
                <form className="mt-6 flex gap-2" onSubmit={(e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const c = voucherInput.trim().toUpperCase(); setVoucher(c || null); if (c) go(2); }}>
                  <label className="flex min-w-0 flex-1 items-center gap-2 rounded-[10px] border border-line px-3.5 py-3">
                    <Tag size={17} className="shrink-0 text-coral-dark" />
                    <span className="sr-only">Kode voucher</span>
                    <input
                      value={voucherInput}
                      onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                      placeholder="cth. PAGI10"
                      className="min-w-0 flex-1 bg-transparent font-mono text-sm font-bold tracking-wider outline-none placeholder:font-sans placeholder:font-normal placeholder:text-ink/35"
                    />
                  </label>
                  <button type="submit" className="shrink-0 rounded-[10px] bg-ink px-5 py-3 text-sm font-bold text-paper">Pakai</button>
                </form>
                {voucher && (
                  <p className="mt-2.5 inline-flex items-center gap-2 rounded-full bg-sage px-4 py-2 text-xs font-bold text-moss" role="status">
                    <Check size={14} weight="bold" /> {voucher} akan divalidasi backend
                    <button type="button" onClick={() => { setVoucher(null); setVoucherInput(""); }} className="underline underline-offset-2">lepas</button>
                  </p>
                )}
                <div className="mt-7 flex gap-3">
                  <button type="button" onClick={() => go(0)} className="inline-flex items-center gap-2 rounded-[10px] border border-line px-5 py-4 text-sm font-bold hover:border-ink/40">
                    <ArrowLeft size={16} /> Kembali
                  </button>
                  <button type="button" onClick={() => go(2)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-[10px] bg-ink px-5 py-4 text-sm font-bold text-paper transition hover:bg-moss">
                    {voucher ? "Lanjut dengan voucher" : "Lewati ke pembayaran"} <ArrowRight size={16} weight="bold" />
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h1 className="display-text mt-2 text-3xl font-bold tracking-[-0.045em]">Bayar via Mayar.</h1>
                <p className="mt-2 text-sm leading-6 text-ink/60">
                  Booking dibuat sebagai <code className="rounded bg-soft px-1.5 py-0.5 text-xs font-bold">PENDING_PAYMENT</code>, lalu
                  kamu diarahkan ke halaman bayar Mayar di tab baru.
                </p>
                <div className="mt-6 rounded-[12px] border border-line bg-soft/60 p-4" role="note" aria-label="Metode pembayaran">
                  <p className="flex items-center gap-2 text-sm font-bold">
                    <LockKey size={17} className="text-coral-dark" /> Bayar via Mayar
                  </p>
                  <p className="mt-1.5 text-sm leading-6 text-ink/60">
                    QRIS, Virtual Account bank, e-wallet, dan kartu dipilih di halaman bayar Mayar —
                    bukan di sini. Total yang ditagih persis <strong>{formatIDR(booking?.total_amount ?? estimate.total)}</strong> dari snapshot backend.
                  </p>
                </div>
                <div className="mt-7 flex gap-3">
                  <button type="button" disabled={working !== "idle"} onClick={() => go(1)} className="inline-flex items-center gap-2 rounded-[10px] border border-line px-5 py-4 text-sm font-bold hover:border-ink/40 disabled:opacity-50">
                    <ArrowLeft size={16} /> Kembali
                  </button>
                  <button
                    type="button"
                    onClick={pay}
                    disabled={working !== "idle"}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-[10px] bg-coral px-5 py-4 text-sm font-bold text-ink transition hover:bg-[#ed8c6b] disabled:opacity-70"
                  >
                    {working !== "idle" ? (
                      <><span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/30 border-t-ink" aria-hidden="true" /> Memproses…</>
                    ) : (
                      <>Bayar {formatIDR(preview?.total_amount ?? estimate.total)} <LockKey size={17} /></>
                    )}
                  </button>
                </div>
                <p className="mt-3 flex items-start justify-center gap-1.5 text-center text-xs leading-5 text-ink/45">
                  <ShieldCheck size={14} className="mt-0.5 shrink-0 text-moss" />
                  Status sukses hanya dari webhook terverifikasi — bukan dari browser.
                </p>
              </div>
            )}

            {step === 3 && (
              <div className="text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-soft text-coral-dark">
                  <span className="h-6 w-6 animate-spin rounded-full border-[3px] border-line border-t-coral-dark" aria-hidden="true" />
                </span>
                <h1 className="display-text mt-5 text-3xl font-bold tracking-[-0.045em]">Menunggu pembayaran…</h1>
                <p className="mx-auto mt-3 max-w-[420px] text-sm leading-6 text-ink/60">
                  Selesaikan bayar di tab Mayar ({booking?.booking_code}). Halaman ini memantau
                  status tiap 5 detik — e-ticket terbit otomatis setelah webhook masuk.
                </p>
                {booking && (
                  <button
                    type="button"
                    onClick={async () => {
                      const pay = await api.post<{ paymentUrl: string }>("/payments", { bookingCode: booking.booking_code }, null);
                      window.open(pay.paymentUrl, "_blank", "noopener");
                    }}
                    className="mt-5 rounded-[10px] border border-line px-5 py-3 text-sm font-bold hover:border-ink/40"
                  >
                    Buka ulang halaman bayar
                  </button>
                )}
                {booking && process.env.NEXT_PUBLIC_DEMO_PAYMENTS === "true" && (
                  <div className="mx-auto mt-4 max-w-[420px] rounded-[12px] border border-dashed border-coral-dark/50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-coral-dark">Mode demo portofolio</p>
                    <p className="mt-1 text-xs leading-5 text-ink/55">
                      Tanpa uang asli — mensimulasikan webhook Mayar terverifikasi via jalur backend asli.
                    </p>
                    <button
                      type="button"
                      disabled={working !== "idle"}
                      onClick={async () => {
                        setWorking("paying");
                        setFatal(null);
                        try {
                          await api.post("/payments/simulate", { bookingCode: booking.booking_code }, null);
                        } catch (e) {
                          setFatal(errMsg(e));
                        } finally {
                          setWorking("idle");
                        }
                      }}
                      className="mt-3 w-full rounded-[10px] bg-coral px-5 py-3 text-sm font-bold text-ink transition hover:bg-[#ed8c6b] disabled:opacity-60"
                    >
                      {working !== "idle" ? "Memproses…" : "Simulasi bayar berhasil"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <motion.aside
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-[16px] bg-ink p-5 text-paper sm:p-6 lg:sticky lg:top-24"
          aria-label="Ringkasan booking"
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-coral">Ringkasan booking</p>
          <h2 className="mt-2 text-lg font-bold leading-snug">{pkg?.activity.title ?? "Memuat…"}</h2>
          <p className="mt-1 text-xs text-paper/55">{pkg ? `${pkg.name} · ${pkg.activity.destination?.name ?? ""}` : ""}</p>
          <p className="mt-1 text-xs text-paper/55">{date} · {guests} peserta</p>
          <div className="mt-5 space-y-2.5 border-t border-paper/15 pt-5 text-sm">
            <div className="flex justify-between"><span className="text-paper/60">Subtotal ({guests} × {formatIDR(estimate.unit)})</span><span className="font-semibold">{formatIDR(preview?.subtotal ?? estimate.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-paper/60">Voucher {voucher ?? "—"}</span><span className="font-semibold">{preview ? `− ${formatIDR(preview.discount_amount)}` : voucher ? "dihitung backend" : "Rp0"}</span></div>
            <div className="flex justify-between"><span className="text-paper/60">Biaya layanan</span><span className="font-semibold">{formatIDR(preview?.platform_fee ?? FEE)}</span></div>
            <div className="flex justify-between border-t border-paper/15 pt-3 text-base font-bold"><span>{preview ? "Total backend" : "Estimasi"}</span><span>{formatIDR(preview?.total_amount ?? estimate.total)}</span></div>
          </div>
          {reservation && (
            <p className="mt-4 rounded-[10px] bg-paper/10 px-3.5 py-3 text-xs leading-5 text-paper/65" role="status">
              Hold aktif {mm}:{ss}. Total final dikunci backend saat booking dibuat.
            </p>
          )}
        </motion.aside>
      </div>
    </section>
  );
}

function CheckoutDetailForm(props: {
  name: string; setName: (v: string) => void;
  email: string; setEmail: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  extraNames: string; setExtraNames: (v: string) => void;
  touched: boolean; nameOk: boolean; emailOk: boolean; phoneOk: boolean;
  working: boolean; onSubmit: () => void;
}) {
  const { name, setName, email, setEmail, phone, setPhone, extraNames, setExtraNames, touched, nameOk, emailOk, phoneOk, working, onSubmit } = props;
  return (
    <div>
      <h1 className="display-text mt-2 text-3xl font-bold tracking-[-0.045em]">Siapa yang berangkat?</h1>
      <p className="mt-2 text-sm leading-6 text-ink/60">Guest checkout — tanpa wajib daftar. Wajib: nama, email, WhatsApp (PRD §12).</p>
      <div className="mt-6 grid gap-5">
        <div>
          <label htmlFor="co-name" className="text-sm font-semibold">Nama lengkap *</label>
          <input id="co-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama sesuai identitas" autoComplete="name" aria-invalid={touched && !nameOk}
            className={`mt-2 w-full rounded-[10px] border bg-transparent px-3.5 py-3 text-sm outline-none focus:border-coral-dark ${touched && !nameOk ? "border-coral-dark" : "border-line"}`} />
          {touched && !nameOk && <p className="mt-1.5 text-xs font-semibold text-coral-dark" role="alert">Minimal 3 karakter.</p>}
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="co-email" className="text-sm font-semibold">Email *</label>
            <input id="co-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="kamu@email.com" autoComplete="email" aria-invalid={touched && !emailOk}
              className={`mt-2 w-full rounded-[10px] border bg-transparent px-3.5 py-3 text-sm outline-none focus:border-coral-dark ${touched && !emailOk ? "border-coral-dark" : "border-line"}`} />
            {touched && !emailOk && <p className="mt-1.5 text-xs font-semibold text-coral-dark" role="alert">Email tidak valid.</p>}
          </div>
          <div>
            <label htmlFor="co-phone" className="text-sm font-semibold">WhatsApp *</label>
            <input id="co-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" autoComplete="tel" aria-invalid={touched && !phoneOk}
              className={`mt-2 w-full rounded-[10px] border bg-transparent px-3.5 py-3 text-sm outline-none focus:border-coral-dark ${touched && !phoneOk ? "border-coral-dark" : "border-line"}`} />
            {touched && !phoneOk && <p className="mt-1.5 text-xs font-semibold text-coral-dark" role="alert">Awali 08, 10–14 digit.</p>}
          </div>
        </div>
        <div>
          <label htmlFor="co-extra" className="text-sm font-semibold">Nama peserta lain <span className="font-normal text-ink/45">(opsional, pisahkan koma)</span></label>
          <input id="co-extra" value={extraNames} onChange={(e) => setExtraNames(e.target.value)} placeholder="cth. Sinta, Bagas"
            className="mt-2 w-full rounded-[10px] border border-line bg-transparent px-3.5 py-3 text-sm outline-none focus:border-coral-dark" />
        </div>
      </div>
      <button type="button" onClick={onSubmit} disabled={working}
        className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-ink px-5 py-4 text-sm font-bold text-paper transition hover:bg-moss disabled:opacity-60">
        {working ? (
          <><span className="h-4 w-4 animate-spin rounded-full border-2 border-paper/30 border-t-paper" aria-hidden="true" /> Menahan slot…</>
        ) : (
          <>Tahan slot & lanjut <ArrowRight size={16} weight="bold" /></>
        )}
      </button>
      <p className="mt-3 text-center text-xs text-ink/45">Slot ditahan 10 menit di server sebelum lanjut.</p>
    </div>
  );
}

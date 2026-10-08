"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Printer, Star } from "@phosphor-icons/react";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ApiError, api, formatIDR } from "../lib/api";
import type { ApiBooking } from "../lib/types";
import { useAuth } from "./providers";
import { TicketCard } from "./ticket-card";

const TIMELINE = ["PENDING_PAYMENT", "CONFIRMED", "CHECKED_IN", "COMPLETED"];
const timelineLabels = ["Pembayaran", "Dikonfirmasi", "Check-in", "Selesai"];

type LookupResult = ApiBooking & { ticketToken?: string | null };

export function BookingDetailClient({
  code,
  presetEmail,
}: {
  code: string;
  presetEmail?: string;
}) {
  const { token, authenticated } = useAuth();
  const [email, setEmail] = useState(presetEmail ?? "");
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(
    presetEmail ?? null,
  );
  const [rating, setRating] = useState(5);
  const [reviewBody, setReviewBody] = useState("");
  const [reviewDone, setReviewDone] = useState(false);
  const [reviewError, setReviewError] = useState("");

  useEffect(() => {
    if (presetEmail) return;
    try {
      const raw = window.sessionStorage.getItem("tripora_last_booking");
      if (raw) {
        const parsed = JSON.parse(raw) as { code?: string; email?: string };
        if (parsed.code === code && parsed.email) {
          setEmail(parsed.email);
          setSubmittedEmail(parsed.email);
        }
      }
    } catch {
      /* abaikan */
    }
  }, [code, presetEmail]);

  const lookup = useQuery({
    queryKey: ["booking-lookup", code, submittedEmail],
    queryFn: () =>
      api.post<LookupResult>(
        "/booking-lookup",
        { bookingCode: code, emailOrPhone: submittedEmail ?? "" },
        null,
      ),
    enabled: submittedEmail !== null,
    retry: false,
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s === "PENDING_PAYMENT" || s === "PAID" ? 5000 : false;
    },
  });

  const booking = lookup.data ?? null;
  const stepIndex = booking ? TIMELINE.indexOf(booking.status) : -1;

  async function sendReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!booking) return;
    setReviewError("");
    try {
      await api.post(
        `/reviews/booking/${booking.id}`,
        { rating, body: reviewBody },
        token,
      );
      setReviewDone(true);
    } catch (e) {
      setReviewError(
        e instanceof ApiError ? e.message : "Gagal mengirim ulasan.",
      );
    }
  }

  return (
    <div>
      <Link
        href="/my-trips"
        className="inline-flex items-center gap-2 text-sm font-bold text-coral-dark underline underline-offset-4"
      >
        <ArrowLeft size={16} /> Kembali ke My Trips
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="mt-6 max-w-[720px]"
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-coral-dark">
          Booking confirmation · {code}
        </p>
        <h1 className="display-text mt-2 text-3xl font-bold tracking-[-0.045em] sm:text-4xl">
          {booking
            ? booking.status === "CONFIRMED"
              ? "Rencana perjalananmu confirmed."
              : `Status: ${booking.status.replace(/_/g, " ")}`
            : "Lacak booking-mu."}
        </h1>
        <p className="mt-4 text-[15px] leading-7 text-ink/60">
          Guest lookup memakai kode booking + email pemesan — tanpa login.
        </p>
      </motion.div>

      {submittedEmail === null ? (
        <form
          onSubmit={(e: FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            if (email.trim()) setSubmittedEmail(email.trim());
          }}
          className="mt-8 grid max-w-[520px] gap-3 rounded-[16px] border border-line bg-paper p-5 sm:p-6"
        >
          <label className="block">
            <span className="text-sm font-semibold">
              Email / WhatsApp pemesan
            </span>
            <input
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kamu@email.com / 08…"
              className="mt-2 w-full rounded-[10px] border border-line bg-transparent px-3.5 py-3 text-sm outline-none focus:border-coral-dark"
            />
          </label>
          <button
            type="submit"
            className="rounded-[10px] bg-ink px-5 py-3 text-sm font-bold text-paper"
          >
            Lihat booking
          </button>
        </form>
      ) : lookup.isLoading ? (
        <div
          className="mt-8 grid max-w-[720px] animate-pulse gap-4"
          aria-busy="true"
          aria-label="Memuat booking"
        >
          <div className="h-64 rounded-[16px] bg-soft" />
        </div>
      ) : lookup.isError || !booking ? (
        <div className="mt-8 max-w-[520px] rounded-[16px] border border-line bg-paper p-6">
          <p className="font-bold">Booking tidak ditemukan.</p>
          <p className="mt-2 text-sm leading-6 text-ink/60">
            {lookup.error instanceof ApiError
              ? lookup.error.message
              : "Periksa kode dan email pemesan."}
          </p>
          <button
            type="button"
            onClick={() => setSubmittedEmail(null)}
            className="mt-4 rounded-[10px] border border-line px-4 py-2.5 text-sm font-bold hover:border-ink/40"
          >
            Coba email lain
          </button>
        </div>
      ) : (
        <>
          <ol
            className="mt-8 grid max-w-[720px] grid-cols-4 gap-1.5"
            aria-label="Status booking"
          >
            {TIMELINE.map((s, i) => (
              <li key={s} className="flex flex-col gap-2">
                <span
                  className={`h-1.5 rounded-full ${stepIndex >= 0 && i <= stepIndex ? "bg-moss" : "bg-line"}`}
                  aria-hidden="true"
                />
                <span
                  className={`text-[9px] font-bold sm:text-[11px] ${stepIndex >= 0 && i <= stepIndex ? "text-ink" : "text-ink/35"}`}
                >
                  {timelineLabels[i]}
                </span>
              </li>
            ))}
          </ol>

          <div className="mt-8 grid max-w-[900px] items-start gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <TicketCard
              code={booking.booking_code}
              activity={booking.activity?.title ?? "-"}
              pkg={booking.package?.name ?? ""}
              slot={booking.slot_start}
              date={booking.booking_date.slice(0, 10)}
              name={booking.booker_name}
              vendor=""
              meetingPoint=""
              status={booking.status}
              token={booking.ticketToken}
            />
            <div className="space-y-5">
              <div className="rounded-[16px] border border-line bg-paper p-5 sm:p-6">
                <h2 className="text-lg font-bold">Ringkasan pembayaran</h2>
                <div className="mt-4 space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-ink/55">Subtotal</span>
                    <span className="font-semibold">
                      {formatIDR(booking.subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink/55">Diskon</span>
                    <span className="font-semibold">
                      − {formatIDR(booking.discount_amount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink/55">Biaya layanan</span>
                    <span className="font-semibold">
                      {formatIDR(booking.platform_fee)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-line pt-3 text-base font-bold">
                    <span>Total</span>
                    <span>{formatIDR(booking.total_amount)}</span>
                  </div>
                </div>
                {booking.status === "PENDING_PAYMENT" && (
                  <Link
                    href={`/payment/${code}`}
                    className="primary-button mt-5"
                  >
                    Lanjutkan pembayaran
                  </Link>
                )}
                {["PAID", "CONFIRMED"].includes(booking.status) && (
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="mt-5 inline-flex items-center gap-2 rounded-[10px] bg-ink px-4 py-2.5 text-sm font-bold text-paper"
                  >
                    <Printer size={16} /> Cetak tiket
                  </button>
                )}
                <p className="mt-3 text-[11px] leading-5 text-ink/45">
                  Pengajuan refund mengikuti kebijakan pesanan. Hubungi mitra
                  atau bantuan Tripora untuk meninjau jumlah yang dapat
                  dikembalikan.
                </p>
              </div>

              <div className="rounded-[16px] border border-line bg-paper p-5 sm:p-6">
                <h2 className="flex items-center gap-2 text-lg font-bold">
                  <Star size={19} weight="fill" className="text-coral-dark" />{" "}
                  Beri ulasan
                </h2>
                {booking.status !== "COMPLETED" ? (
                  <p className="mt-1.5 text-sm text-ink/55">
                    Review terbuka setelah trip COMPLETED.
                  </p>
                ) : !authenticated ? (
                  <p className="mt-3 text-sm leading-6 text-ink/60">
                    <Link
                      href="/auth/login"
                      className="font-bold text-coral-dark underline underline-offset-4"
                    >
                      Masuk
                    </Link>{" "}
                    dengan akun pemilik booking untuk mengulas.
                  </p>
                ) : reviewDone || booking.review ? (
                  <p
                    className="mt-3 inline-flex items-center gap-2 rounded-full bg-sage px-4 py-2 text-sm font-bold text-moss"
                    role="status"
                  >
                    <Check size={17} weight="bold" /> Ulasan tersimpan. Terima
                    kasih!
                  </p>
                ) : (
                  <form onSubmit={sendReview} className="mt-4">
                    {reviewError && (
                      <p
                        className="mb-3 rounded-[10px] bg-[#f6d9c8] px-4 py-2.5 text-xs font-bold text-[#8a3a20]"
                        role="alert"
                      >
                        {reviewError}
                      </p>
                    )}
                    <div
                      className="flex gap-1.5"
                      role="radiogroup"
                      aria-label="Rating"
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          role="radio"
                          aria-checked={rating === n}
                          aria-label={`${n} bintang`}
                          onClick={() => setRating(n)}
                          className="rounded-[8px] p-1"
                        >
                          <Star
                            size={26}
                            weight={n <= rating ? "fill" : "regular"}
                            className={
                              n <= rating ? "text-coral-dark" : "text-ink/25"
                            }
                          />
                        </button>
                      ))}
                    </div>
                    <label className="mt-3 block">
                      <span className="sr-only">Tulis ulasan</span>
                      <textarea
                        required
                        rows={3}
                        value={reviewBody}
                        onChange={(e) => setReviewBody(e.target.value)}
                        placeholder="Ceritakan pengalamanmu…"
                        className="mt-1 w-full resize-none rounded-[10px] border border-line bg-transparent px-3.5 py-3 text-sm outline-none placeholder:text-ink/35 focus:border-coral-dark"
                      />
                    </label>
                    <button
                      type="submit"
                      className="mt-3 rounded-[10px] bg-coral px-5 py-3 text-sm font-bold text-ink transition hover:bg-[#ed8c6b]"
                    >
                      Kirim ulasan
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

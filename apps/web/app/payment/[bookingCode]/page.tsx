"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowLeft } from "@phosphor-icons/react";
import { SiteFooter, SiteHeader } from "../../components/site-header";
import { StatusPill } from "../../components/workspace-shell";
import { ApiError, api, formatIDR } from "../../lib/api";

interface LookupResult {
  booking_code: string;
  guestAccessToken: string;
  status: string;
  subtotal: number;
  discount_amount: number;
  platform_fee: number;
  total_amount: number;
  payment?: { status: string; provider: string } | null;
  activity?: { title: string } | null;
}

export default function PaymentPage({
  params,
}: {
  params: Promise<{ bookingCode: string }>;
}) {
  const { bookingCode } = use(params);
  const code = decodeURIComponent(bookingCode).toUpperCase();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  const lookup = useQuery({
    queryKey: ["payment-lookup", code, submitted],
    queryFn: () =>
      api.post<LookupResult>(
        "/booking-lookup",
        { bookingCode: code, emailOrPhone: submitted ?? "" },
        null,
      ),
    enabled: submitted !== null,
    retry: false,
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s === "PENDING_PAYMENT" || s === "PAID" ? 5000 : false;
    },
  });
  const booking = lookup.data ?? null;

  async function reopen() {
    if (!booking || busy) return;
    setBusy(true);
    setError("");
    try {
      const pay = await api.post<{ paymentUrl: string }>(
        "/payments",
        {
          bookingCode: booking.booking_code,
          guestAccessToken: booking.guestAccessToken,
        },
        null,
      );
      setPaymentUrl(pay.paymentUrl);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Gagal membuka pembayaran.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="bg-paper text-ink">
      <SiteHeader />
      <section className="mx-auto max-w-[560px] px-5 pb-24 pt-14 sm:pt-20">
        <Link
          href="/my-trips"
          className="inline-flex items-center gap-2 text-sm font-bold text-coral-dark underline underline-offset-4"
        >
          <ArrowLeft size={16} /> My Trips
        </Link>
        <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.18em] text-coral-dark">
          Pembayaran · {code}
        </p>
        <h1 className="display-text mt-2 text-3xl font-bold tracking-[-0.045em] sm:text-4xl">
          Status pembayaran.
        </h1>

        {submitted === null ? (
          <form
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              if (email.trim()) setSubmitted(email.trim());
            }}
            className="mt-8 grid gap-3 rounded-[16px] border border-line bg-paper p-5 sm:p-6"
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
              Lihat status
            </button>
          </form>
        ) : lookup.isLoading ? (
          <div
            className="mt-8 h-48 animate-pulse rounded-[16px] bg-soft"
            aria-busy="true"
            aria-label="Memuat pembayaran"
          />
        ) : lookup.isError || !booking ? (
          <div className="mt-8 rounded-[16px] border border-line bg-paper p-6 text-sm text-ink/60">
            {lookup.error instanceof ApiError
              ? lookup.error.message
              : "Booking tidak ditemukan."}
            <button
              type="button"
              onClick={() => setSubmitted(null)}
              className="text-link mt-3"
            >
              Ubah email atau telepon
            </button>
          </div>
        ) : (
          <div className="mt-8 rounded-[16px] border border-line bg-paper p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold">{booking.activity?.title ?? code}</h2>
              <StatusPill status={booking.status} />
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-ink/55">Total tagihan</span>
                <span className="font-bold">
                  {formatIDR(booking.total_amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink/55">Via</span>
                <span className="font-semibold">
                  {booking.payment?.provider ?? "mayar"}
                </span>
              </div>
            </div>
            {error && (
              <p
                className="mt-3 text-xs font-bold text-coral-dark"
                role="alert"
              >
                {error}
              </p>
            )}
            {booking.status === "PENDING_PAYMENT" ? (
              <>
                <button
                  type="button"
                  onClick={reopen}
                  disabled={busy}
                  className="mt-5 w-full rounded-[10px] bg-coral px-5 py-3.5 text-sm font-bold text-ink transition hover:bg-[#ed8c6b] disabled:opacity-60"
                >
                  {busy ? "Membuka…" : "Buka halaman bayar"}
                </button>
                {paymentUrl && (
                  <a
                    href={paymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="primary-button mt-3 w-full"
                  >
                    Lanjut ke Mayar
                  </a>
                )}
                {process.env.NEXT_PUBLIC_DEMO_PAYMENTS === "true" && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      setError("");
                      try {
                        await api.post(
                          "/payments/simulate",
                          {
                            bookingCode: booking.booking_code,
                            guestAccessToken: booking.guestAccessToken,
                          },
                          null,
                        );
                        await lookup.refetch();
                      } catch (e) {
                        setError(
                          e instanceof ApiError ? e.message : "Simulasi gagal.",
                        );
                      } finally {
                        setBusy(false);
                      }
                    }}
                    className="mt-3 w-full rounded-[10px] border border-dashed border-coral-dark/50 px-5 py-3 text-sm font-bold hover:border-coral-dark disabled:opacity-60"
                  >
                    Simulasi bayar berhasil (demo)
                  </button>
                )}
              </>
            ) : (
              <Link
                href={`/booking/${booking.booking_code}`}
                className="mt-5 block rounded-[10px] bg-ink px-5 py-3.5 text-center text-sm font-bold text-paper"
              >
                Lihat detail pesanan
              </Link>
            )}
            <p className="mt-3 text-[11px] leading-5 text-ink/45">
              Tiket tersedia setelah pembayaran dikonfirmasi.
            </p>
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}

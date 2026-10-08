"use client";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  LockKey,
  Timer,
} from "@phosphor-icons/react";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ApiError, api, formatIDR, getSessionId } from "../lib/api";
import type { ApiBooking, ApiPackage } from "../lib/types";
import { TicketCard } from "./ticket-card";
import { StatusPill } from "./workspace-shell";

interface PackageDetail extends ApiPackage {
  activity: {
    title: string;
    slug: string;
    meeting_point?: string;
    vendor?: { name: string };
    destination?: { name: string };
  };
}
interface Hold {
  reservationId: string;
  expiresAt: string;
}
interface Price {
  subtotal: number;
  discount_amount: number;
  platform_fee: number;
  total_amount: number;
}
interface Created extends Price {
  booking_code: string;
  guestAccessToken: string;
  paymentExpiresAt: string;
}
interface Invoice {
  paymentUrl: string;
  expiresAt: string;
}
function message(error: unknown) {
  if (!(error instanceof ApiError)) return "Koneksi bermasalah. Coba lagi.";
  const known: Record<string, string> = {
    SLOT_NOT_AVAILABLE: "Sisa tempat sudah berubah. Pilih jadwal lain.",
    RESERVATION_EXPIRED: "Waktu penahanan slot habis. Pilih jadwal lagi.",
    PAYMENT_EXPIRED:
      "Batas pembayaran habis. Cek status pesanan sebelum membuat pesanan baru.",
    DUPLICATE_BOOKING_DETECTED:
      "Kamu sudah punya pesanan serupa yang belum dibayar. Cari melalui Pesanan saya.",
    TOO_MANY_ACTIVE_BOOKINGS:
      "Selesaikan atau batalkan pesanan yang belum dibayar terlebih dahulu.",
    INVALID_PROMOTION:
      "Voucher tidak berlaku untuk pesanan ini. Ubah atau hapus voucher.",
    BOOKING_CUTOFF_REACHED: "Waktu pemesanan jadwal ini sudah ditutup.",
    SLOT_IN_PAST: "Jadwal sudah lewat. Pilih waktu lain.",
    BOOKING_DATE_IN_PAST: "Tanggal sudah lewat. Pilih tanggal lain.",
    INVALID_QUANTITY: "Jumlah peserta tidak sesuai aturan paket.",
  };
  if (error.status === 429)
    return "Terlalu banyak percobaan. Tunggu sebentar, lalu coba lagi.";
  return (
    known[error.code] ??
    "Pesanan belum bisa diproses. Coba lagi atau hubungi bantuan."
  );
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
  });
  const pkg = pkgQuery.data;
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [voucherInput, setVoucherInput] = useState("");
  const [voucher, setVoucher] = useState("");
  const [hold, setHold] = useState<Hold | null>(null);
  const [booking, setBooking] = useState<Created | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [found, setFound] = useState<ApiBooking | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [clock, setClock] = useState(Date.now);
  const deadline = booking?.paymentExpiresAt ?? hold?.expiresAt;
  const remaining = deadline
    ? Math.max(0, Math.ceil((Date.parse(deadline) - clock) / 1000))
    : 0;
  const holdExpired = Boolean(hold && !booking && remaining <= 0);
  const paymentExpired = Boolean(booking && remaining <= 0);
  useEffect(() => {
    if (!deadline) return;
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [deadline]);

  const price = useQuery({
    queryKey: ["checkout-price", packageId, scheduleId, date, guests, voucher],
    queryFn: () =>
      api.post<Price>("/bookings/price-preview", {
        packageId,
        scheduleId,
        date,
        participants: guests,
        ...(voucher ? { promotionCode: voucher } : {}),
      }),
    enabled: step === 1 && Boolean(hold) && !booking && !holdExpired,
    staleTime: 0,
  });
  const totals = booking ?? price.data;
  const lookup = useQuery({
    queryKey: ["checkout-status", booking?.booking_code, email],
    queryFn: () =>
      api.post<ApiBooking>("/booking-lookup", {
        bookingCode: booking?.booking_code,
        emailOrPhone: email.trim(),
      }),
    enabled: Boolean(booking),
    retry: 1,
    refetchInterval: (query) =>
      query.state.data && query.state.data.status !== "PENDING_PAYMENT"
        ? false
        : 5000,
  });
  useEffect(() => {
    if (lookup.data) setFound(lookup.data);
  }, [lookup.data]);

  async function reserve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (hold && !holdExpired) {
      setStep(1);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await api.post<Hold>("/reservations", {
        packageId,
        scheduleId,
        date,
        participants: guests,
        sessionId: getSessionId(),
      });
      setHold(result);
      setClock(Date.now());
      setStep(1);
    } catch (problem) {
      setError(message(problem));
    } finally {
      setBusy(false);
    }
  }

  async function createInvoice(current: Created) {
    const result = await api.post<Invoice>("/payments", {
      bookingCode: current.booking_code,
      guestAccessToken: current.guestAccessToken,
    });
    setInvoice(result);
  }

  async function pay() {
    if (
      busy ||
      (!booking &&
        (!hold ||
          holdExpired ||
          !price.data ||
          price.isFetching ||
          price.isError))
    )
      return;
    setBusy(true);
    setError("");
    try {
      const current =
        booking ??
        (await api.post<Created>("/bookings", {
          reservationId: hold!.reservationId,
          booker: {
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
          },
          sessionId: getSessionId(),
          ...(voucher ? { promotionCode: voucher } : {}),
        }));
      // Persist the booking before invoice creation: retry cannot create a second order.
      setBooking(current);
      setStep(2);
      setClock(Date.now());
      try {
        sessionStorage.setItem(
          "tripora_last_booking",
          JSON.stringify({ code: current.booking_code, email: email.trim() }),
        );
      } catch {
        /* lookup remains available manually */
      }
      await createInvoice(current);
    } catch (problem) {
      setError(message(problem));
    } finally {
      setBusy(false);
    }
  }

  if (pkgQuery.isPending)
    return (
      <section className="public-container max-w-5xl py-12" aria-busy="true">
        <div className="h-10 w-2/3 animate-pulse rounded-xl bg-line" />
        <div className="mt-8 h-80 animate-pulse rounded-2xl bg-line" />
      </section>
    );
  if (!pkg || pkgQuery.isError)
    return (
      <section id="content" className="public-container py-16">
        <div className="empty-panel">
          <h1>Paket belum bisa dimuat.</h1>
          <p>Coba lagi atau pilih aktivitas lain.</p>
          <button
            type="button"
            onClick={() => pkgQuery.refetch()}
            className="primary-button"
          >
            Coba lagi
          </button>
          <Link href="/activities" className="text-link ml-5">
            Pilih aktivitas
          </Link>
        </div>
      </section>
    );
  const confirmed =
    found &&
    ["PAID", "CONFIRMED", "CHECKED_IN", "COMPLETED"].includes(found.status);
  if (confirmed && found)
    return (
      <section id="content" className="public-container max-w-3xl py-12">
        <div className="text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sage text-moss">
            <Check size={28} />
          </span>
          <p className="eyebrow mt-5">Siap untuk berangkat</p>
          <h1 className="editorial-title mt-3 text-4xl sm:text-5xl">
            Tiketmu sudah tersedia.
          </h1>
          <p className="mt-4 text-ink/70">
            Simpan kode {found.booking_code} dan tunjukkan QR saat check-in.
          </p>
        </div>
        <div className="mx-auto mt-8 max-w-md">
          <TicketCard
            code={found.booking_code}
            activity={pkg.activity.title}
            pkg={pkg.name}
            slot={found.slot_start}
            date={found.booking_date.slice(0, 10)}
            name={found.booker_name}
            vendor={pkg.activity.vendor?.name ?? ""}
            meetingPoint={
              pkg.activity.meeting_point ?? "Lihat detail aktivitas"
            }
            token={found.ticketToken}
            status={found.status}
          />
        </div>
        <div className="mt-6 text-center">
          <Link
            href={`/booking/${found.booking_code}`}
            className="primary-button"
          >
            Lihat detail pesanan
          </Link>
        </div>
      </section>
    );
  if (
    found &&
    ["EXPIRED", "CANCELLED", "REFUND_PENDING", "REFUNDED"].includes(
      found.status,
    )
  )
    return (
      <section id="content" className="public-container max-w-3xl py-12">
        <div className="empty-panel">
          <StatusPill status={found.status} />
          <h1 className="mt-5">Pesanan {found.booking_code}</h1>
          <p>
            {found.status === "REFUND_PENDING"
              ? "Pembayaran diterima setelah batas waktu atau pengembalian dana sedang diproses. Periksa detail pesanan untuk status terbaru."
              : "Periksa detail pesanan untuk informasi selanjutnya."}
          </p>
          <Link
            href={`/booking/${found.booking_code}`}
            className="primary-button"
          >
            Lihat status pesanan
          </Link>
        </div>
      </section>
    );

  return (
    <section id="content" className="public-container max-w-6xl pb-20 pt-9">
      <Link href={`/activities/${pkg.activity.slug}`} className="text-link">
        <ArrowLeft size={17} />
        Kembali ke aktivitas
      </Link>
      <div className="mt-6">
        <p className="eyebrow">Pemesanan pengalaman</p>
        <h1 className="editorial-title mt-3 text-4xl sm:text-5xl">
          Sedikit lagi, berangkat.
        </h1>
      </div>
      <ol
        aria-label="Langkah pemesanan"
        className="mt-8 flex gap-3 border-b border-line pb-6"
      >
        {["Pemesan", "Ringkasan", "Pembayaran"].map((label, index) => (
          <li
            key={label}
            className={`flex flex-1 items-center gap-2 text-xs font-semibold sm:text-sm ${index <= step ? "text-moss" : "text-ink/55"}`}
            aria-current={index === step ? "step" : undefined}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${index <= step ? "bg-moss text-white" : "bg-line"}`}
            >
              {index < step ? <Check size={16} /> : index + 1}
            </span>
            {label}
          </li>
        ))}
      </ol>
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_360px]">
        <div className="rounded-2xl border border-line bg-white p-5 sm:p-8">
          {deadline && (
            <p
              role="status"
              className="mb-5 flex items-center gap-2 text-sm font-semibold text-moss"
            >
              <Timer size={18} />
              {booking ? "Batas pembayaran" : "Slot ditahan"}:{" "}
              {String(Math.floor(remaining / 60)).padStart(2, "0")}:
              {String(remaining % 60).padStart(2, "0")}
            </p>
          )}
          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl bg-[#f6d9c8] p-4 text-sm leading-6 text-[#8a3a20]"
            >
              {error}
              {error.includes("Pesanan saya") && (
                <Link href="/my-trips" className="ml-2 font-bold underline">
                  Cari pesanan
                </Link>
              )}
            </div>
          )}
          {holdExpired ? (
            <div>
              <h2 className="text-2xl font-bold">
                Waktu penahanan slot habis.
              </h2>
              <p className="mt-3 leading-7 text-ink/70">
                Pilih lagi jadwal untuk memeriksa sisa tempat terbaru.
              </p>
              <Link
                href={`/activities/${pkg.activity.slug}`}
                className="primary-button mt-6"
              >
                Pilih jadwal lagi
              </Link>
            </div>
          ) : step === 0 ? (
            <form onSubmit={reserve}>
              <h2 className="text-2xl font-bold tracking-tight">
                Siapa yang memesan?
              </h2>
              <p className="mt-2 text-sm leading-6 text-ink/70">
                Tidak wajib punya akun. Email dan nomor telepon digunakan untuk
                mengakses pesanan.
              </p>
              <div className="mt-6 grid gap-5">
                <label className="checkout-field">
                  Nama lengkap
                  <input
                    required
                    minLength={3}
                    maxLength={120}
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Nama pemesan"
                  />
                </label>
                <label className="checkout-field">
                  Email
                  <input
                    required
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="kamu@email.com"
                  />
                </label>
                <label className="checkout-field">
                  Nomor telepon
                  <input
                    required
                    type="tel"
                    pattern="08[0-9]{8,12}"
                    autoComplete="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="08xxxxxxxxxx"
                  />
                  <span className="text-xs font-normal text-ink/65">
                    Gunakan format 08, dengan 10–14 digit.
                  </span>
                </label>
              </div>
              <button
                type="submit"
                disabled={busy}
                className="primary-button mt-7 w-full"
              >
                {busy ? "Memeriksa jadwal…" : "Lanjut ke ringkasan"}
                <ArrowRight size={17} />
              </button>
            </form>
          ) : step === 1 ? (
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Periksa rencanamu.
              </h2>
              <dl className="mt-5 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-ink/65">Pemesan</dt>
                  <dd className="break-words text-right font-semibold">
                    {name}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink/65">Email</dt>
                  <dd className="min-w-0 break-words text-right">{email}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink/65">Telepon</dt>
                  <dd>{phone}</dd>
                </div>
              </dl>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  setVoucher(voucherInput.trim().toUpperCase());
                }}
                className="mt-6"
              >
                <label
                  htmlFor="checkout-voucher"
                  className="text-sm font-semibold"
                >
                  Voucher{" "}
                  <span className="font-normal text-ink/65">(opsional)</span>
                </label>
                <div className="mt-2 flex gap-2">
                  <input
                    id="checkout-voucher"
                    maxLength={80}
                    value={voucherInput}
                    onChange={(event) => setVoucherInput(event.target.value)}
                    placeholder="Kode voucher"
                    className="min-h-12 min-w-0 flex-1 rounded-lg border border-line px-3"
                  />
                  <button type="submit" className="secondary-button">
                    Terapkan
                  </button>
                </div>
                {voucher && (
                  <button
                    type="button"
                    onClick={() => {
                      setVoucher("");
                      setVoucherInput("");
                    }}
                    className="text-link mt-1"
                  >
                    Hapus voucher {voucher}
                  </button>
                )}
              </form>
              {price.isError && (
                <div
                  role="alert"
                  className="mt-5 text-sm leading-6 text-coral-dark"
                >
                  <p>{message(price.error)}</p>
                  <button
                    type="button"
                    onClick={() => price.refetch()}
                    className="text-link"
                  >
                    Hitung ulang
                  </button>
                </div>
              )}
              <p className="mt-6 text-sm leading-6 text-ink/70">
                Dengan melanjutkan, kamu menyetujui{" "}
                <Link href="/syarat-ketentuan" className="underline">
                  syarat pemesanan
                </Link>{" "}
                dan{" "}
                <Link href="/kebijakan-refund" className="underline">
                  kebijakan pembatalan
                </Link>
                .
              </p>
              <button
                type="button"
                onClick={pay}
                disabled={
                  busy || !price.data || price.isFetching || price.isError
                }
                className="primary-button mt-6 w-full"
              >
                <LockKey size={18} />
                {busy
                  ? "Membuat pesanan…"
                  : price.isFetching
                    ? "Menghitung total…"
                    : `Lanjut bayar${price.data ? ` ${formatIDR(price.data.total_amount)}` : ""}`}
              </button>
              <button
                type="button"
                onClick={() => setStep(0)}
                disabled={busy}
                className="text-link mt-3"
              >
                Ubah data pemesan
              </button>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                {paymentExpired
                  ? "Periksa status pembayaran."
                  : "Selesaikan pembayaran."}
              </h2>
              <p className="mt-3 text-sm leading-7 text-ink/70">
                Kode pesanan <strong>{booking?.booking_code}</strong>. Simpan
                kode ini bersama email pemesan. Tiket tersedia setelah
                pembayaran dikonfirmasi.
              </p>
              {invoice && !paymentExpired ? (
                <a
                  href={invoice.paymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="primary-button mt-6 w-full"
                >
                  Buka halaman bayar Mayar <ArrowRight size={17} />
                </a>
              ) : !paymentExpired ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={pay}
                  className="primary-button mt-6 w-full"
                >
                  {busy
                    ? "Menyiapkan pembayaran…"
                    : "Siapkan halaman pembayaran"}
                </button>
              ) : null}
              <p role="status" className="mt-5 text-sm leading-6 text-ink/65">
                {lookup.isError
                  ? "Status belum bisa diperbarui. Coba lagi."
                  : paymentExpired
                    ? "Batas pembayaran telah lewat. Jangan bayar lagi; cek status pesanan."
                    : "Halaman ini memeriksa konfirmasi pembayaran secara berkala."}
              </p>
              <button
                type="button"
                onClick={() => lookup.refetch()}
                className="text-link mt-2"
              >
                Perbarui status
              </button>
              <Link
                href={`/booking/${booking?.booking_code}`}
                className="text-link mt-2 ml-5"
              >
                Detail pesanan
              </Link>
              {booking &&
                process.env.NEXT_PUBLIC_DEMO_PAYMENTS === "true" &&
                !paymentExpired && (
                  <div className="mt-6 rounded-xl border border-dashed border-coral-dark p-4">
                    <p className="text-xs font-bold text-coral-dark">
                      Demo — tidak menggunakan uang asli
                    </p>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        setError("");
                        try {
                          await api.post("/payments/simulate", {
                            bookingCode: booking.booking_code,
                            guestAccessToken: booking.guestAccessToken,
                          });
                          await lookup.refetch();
                        } catch (problem) {
                          setError(message(problem));
                        } finally {
                          setBusy(false);
                        }
                      }}
                      className="secondary-button mt-3"
                    >
                      Simulasikan pembayaran
                    </button>
                  </div>
                )}
            </div>
          )}
        </div>
        <aside className="rounded-2xl bg-ink p-6 text-paper lg:sticky lg:top-24">
          <p className="text-xs font-semibold uppercase tracking-widest text-paper/65">
            Rencanamu
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight">
            {pkg.activity.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-paper/75">
            {pkg.name} · {pkg.activity.destination?.name}
          </p>
          <dl className="mt-5 space-y-3 border-t border-paper/20 pt-5 text-sm">
            <div className="flex justify-between">
              <dt className="text-paper/70">Tanggal</dt>
              <dd>{date}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-paper/70">Peserta</dt>
              <dd>{guests} orang</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-paper/70">Harga per peserta</dt>
              <dd>{formatIDR(pkg.base_price)}</dd>
            </div>
          </dl>
          {totals ? (
            <dl className="mt-5 space-y-3 border-t border-paper/20 pt-5 text-sm">
              <div className="flex justify-between">
                <dt className="text-paper/70">Subtotal</dt>
                <dd>{formatIDR(totals.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-paper/70">Diskon</dt>
                <dd>−{formatIDR(totals.discount_amount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-paper/70">Biaya layanan</dt>
                <dd>{formatIDR(totals.platform_fee)}</dd>
              </div>
              <div className="flex justify-between border-t border-paper/20 pt-4 text-lg font-bold">
                <dt>Total</dt>
                <dd>{formatIDR(totals.total_amount)}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-5 border-t border-paper/20 pt-5 text-sm leading-6 text-paper/75">
              Subtotal paket {formatIDR(pkg.base_price * guests)}. Biaya layanan
              dan diskon dihitung pada ringkasan sebelum pembayaran.
            </p>
          )}
          <p className="mt-6 text-xs leading-6 text-paper/70">
            Periksa jadwal, ketentuan usia, dan titik pertemuan pada detail
            aktivitas sebelum memesan.
          </p>
        </aside>
      </div>
    </section>
  );
}

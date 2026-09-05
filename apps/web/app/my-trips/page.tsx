"use client";

import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, MagnifyingGlass, Ticket } from "@phosphor-icons/react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { SiteFooter, SiteHeader } from "../components/site-header";
import { useAuth } from "../components/providers";
import { StatusPill } from "../components/workspace-shell";
import { ApiError, api, formatIDR } from "../lib/api";
import type { ApiBooking } from "../lib/types";

export default function MyTripsPage() {
  const { user, token, loading: authLoading } = useAuth();
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState<{ code: string; email: string } | null>(null);

  const lookup = useQuery({
    queryKey: ["lookup", submitted?.code, submitted?.email],
    queryFn: () =>
      api.post<ApiBooking & { ticketToken?: string | null }>("/booking-lookup", {
        bookingCode: submitted!.code,
        emailOrPhone: submitted!.email,
      }, null),
    enabled: submitted !== null,
    retry: false,
  });

  const myTrips = useQuery({
    queryKey: ["my-trips"],
    queryFn: () => api.get<{ bookings: ApiBooking[] }>("/me/trips", token),
    enabled: Boolean(token && user),
    retry: false,
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (code.trim() && email.trim()) {
      setSubmitted({ code: code.trim().toUpperCase(), email: email.trim() });
    }
  }

  return (
    <main className="bg-paper text-ink">
      <SiteHeader />
      <section className="mx-auto max-w-[1100px] px-5 pb-24 pt-14 sm:px-8 sm:pt-20 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-[660px]"
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-coral-dark">
            My Trips · booking lookup
          </p>
          <h1 className="display-text mt-3 text-4xl font-bold leading-[1.0] tracking-[-0.05em] sm:text-5xl">
            Semua rencana perjalananmu, di satu tempat.
          </h1>
          <p className="mt-5 max-w-[520px] text-base leading-7 text-ink/60">
            Guest cukup pakai kode <code className="rounded bg-soft px-1.5 py-0.5 text-xs font-bold">TRP-XXXXXX</code> +
            email. Customer login melihat histori di bawah.
          </p>
        </motion.div>

        {user && (
          <div className="mt-10">
            <h2 className="text-xl font-bold tracking-[-0.03em]">Trip milik {user.full_name}</h2>
            {myTrips.isLoading ? (
              <div className="mt-4 grid animate-pulse gap-3" aria-busy="true" aria-label="Memuat trip">
                {[0, 1].map((i) => <div key={i} className="h-24 rounded-[12px] bg-soft" />)}
              </div>
            ) : (myTrips.data?.bookings ?? []).length === 0 ? (
              <p className="mt-4 rounded-[12px] border border-dashed border-line bg-paper px-5 py-8 text-center text-sm text-ink/55">
                Belum ada trip dengan akun ini. Booking sebagai guest tidak otomatis masuk sini.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {myTrips.data!.bookings.map((t) => (
                  <article key={t.id} className="grid gap-3 rounded-[12px] border border-line bg-paper p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:p-5">
                    <div>
                      <p className="font-mono text-xs font-bold text-ink/45">{t.booking_code}</p>
                      <h3 className="mt-1.5 font-bold">{t.activity?.title ?? "-"}</h3>
                      <p className="mt-0.5 text-xs text-ink/55">
                        {t.booking_date.slice(0, 10)} · {t.slot_start} · {t.participant_count} peserta · {formatIDR(t.total_amount)}
                      </p>
                    </div>
                    <StatusPill status={t.status} />
                    <Link href={`/booking/${t.booking_code}`} className="text-sm font-bold text-coral-dark underline underline-offset-4">
                      Lihat detail
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-10 grid items-start gap-6 lg:grid-cols-[1fr_0.9fr]">
          <motion.form
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            onSubmit={submit}
            className="rounded-[16px] bg-ink p-6 text-paper sm:p-8"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-coral text-ink">
                <Ticket size={20} />
              </span>
              <div>
                <h2 className="font-bold">Cari booking guest</h2>
                <p className="mt-1 text-sm text-paper/55">Tanpa login — sesuai PRD §4.1.</p>
              </div>
            </div>
            <label className="mt-7 block">
              <span className="text-sm font-semibold">Kode booking</span>
              <input
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="mt-2 w-full rounded-[10px] border border-paper/20 bg-transparent px-3.5 py-3 text-sm font-bold tracking-wider outline-none placeholder:font-normal placeholder:text-paper/35 focus:border-coral"
                placeholder="TRP-260905-XXXXX"
              />
            </label>
            <label className="mt-4 block">
              <span className="text-sm font-semibold">Email / WhatsApp pemesan</span>
              <input
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-[10px] border border-paper/20 bg-transparent px-3.5 py-3 text-sm outline-none placeholder:text-paper/35 focus:border-coral"
                placeholder="kamu@email.com"
              />
            </label>
            <button
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-coral px-4 py-3.5 text-sm font-bold text-ink transition hover:bg-[#ed8c6b]"
              type="submit"
            >
              Cari booking <MagnifyingGlass size={17} />
            </button>
            <AnimatePresence initial={false}>
              {submitted && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="mt-5 rounded-[12px] bg-paper/10 p-4" role="status">
                    {lookup.isLoading ? (
                      <p className="text-sm text-paper/70">Mencari…</p>
                    ) : lookup.isError || !lookup.data ? (
                      <p className="text-sm text-paper/70">
                        Tidak ketemu. {lookup.error instanceof ApiError ? lookup.error.message : "Periksa kode dan email."}
                      </p>
                    ) : (
                      <>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold tracking-wider text-coral">
                              {lookup.data.booking_code} · {lookup.data.status.replace(/_/g, " ")}
                            </p>
                            <p className="mt-1 text-sm font-bold">{lookup.data.activity?.title}</p>
                            <p className="mt-0.5 text-xs text-paper/55">
                              {lookup.data.booking_date.slice(0, 10)} · {lookup.data.slot_start} · {lookup.data.participant_count} peserta · {formatIDR(lookup.data.total_amount)}
                            </p>
                          </div>
                        </div>
                        <Link
                          href={`/booking/${lookup.data.booking_code}`}
                          className="mt-3 inline-flex items-center gap-2 rounded-[10px] bg-coral px-4 py-2.5 text-xs font-bold text-ink"
                        >
                          Buka e-ticket <ArrowRight size={14} weight="bold" />
                        </Link>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.form>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-[16px] border border-line bg-paper p-6 sm:p-8"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-coral-dark">
              Customer · lebih rapi
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em]">
              {authLoading ? "Memeriksa sesi…" : user ? `Halo, ${user.full_name}.` : "Masuk untuk histori penuh."}
            </h2>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-ink/60">
              {["Booking history + e-ticket tersimpan", "Wishlist & saved traveler", "Review setelah COMPLETED"].map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-coral-dark" />
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              {user ? (
                <Link href="/account" className="inline-flex items-center gap-2 rounded-[10px] bg-ink px-5 py-3 text-sm font-bold text-paper">
                  Buka account <ArrowRight size={16} weight="bold" />
                </Link>
              ) : (
                <Link href="/auth/login" className="inline-flex items-center gap-2 rounded-[10px] bg-ink px-5 py-3 text-sm font-bold text-paper">
                  Masuk <ArrowRight size={16} weight="bold" />
                </Link>
              )}
              <Link href="/explore" className="inline-flex items-center gap-2 rounded-[10px] border border-line px-5 py-3 text-sm font-bold hover:border-ink/40">
                Explore dulu
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

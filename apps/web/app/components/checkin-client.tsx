"use client";

import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle,
  MagnifyingGlass,
  QrCode,
  WarningCircle,
} from "@phosphor-icons/react";
import { FormEvent, useState } from "react";
import { useAuth } from "./providers";
import { ApiError, api } from "../lib/api";

interface ScanResult {
  checkinId: string;
  bookingCode: string;
  status: string;
}

interface TodayBooking {
  id: string;
  booking_code: string;
  booker_name: string;
  booking_date: string;
  slot_start: string;
  participant_count: number;
  status: string;
  activity?: { title: string };
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function CheckinClient() {
  const { authenticated, token } = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const today = useQuery({
    queryKey: ["staff-today"],
    queryFn: () =>
      api.get<{ bookings: TodayBooking[] }>("/vendor/bookings", token),
    enabled: Boolean(authenticated),
  });
  const todays = (today.data?.bookings ?? []).filter(
    (b) => b.booking_date.slice(0, 10) === todayISO(),
  );
  const checkedIn = todays.filter((b) =>
    ["CHECKED_IN", "COMPLETED"].includes(b.status),
  ).length;
  const totalPax = todays.reduce((a, b) => a + b.participant_count, 0);

  async function scan(tokenValue: string) {
    const t = tokenValue.trim();
    if (!t || busy) return;
    setBusy(true);
    setResult(null);
    setErrorCode(null);
    try {
      const res = await api.post<ScanResult>(
        "/vendor/checkins/scan",
        { token: t },
        token,
      );
      setResult(res);
      setCode("");
      await today.refetch();
    } catch (e) {
      setErrorCode(e instanceof ApiError ? e.code : "REQUEST_FAILED");
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void scan(code);
  }

  return (
    <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_0.8fr]">
      <div className="rounded-[16px] border border-line bg-paper p-6">
        <div
          className="flex min-h-[280px] flex-col items-center justify-center rounded-[12px] border-2 border-dashed border-line bg-soft/60 p-6 text-center"
          aria-live="polite"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-paper text-coral-dark shadow-sm">
            <QrCode size={32} />
          </span>
          <h2 className="mt-4 text-xl font-bold tracking-[-0.02em]">
            Scan QR e-ticket
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-ink/60">
            Tempel token QR ke kolom di bawah. Server memverifikasi signature,
            status, dan kepemilikan vendor.
          </p>
          <AnimatePresence mode="wait" initial={false}>
            {busy && (
              <motion.p
                key="scanning"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-4 text-sm font-semibold text-ink/55"
                role="status"
              >
                Memverifikasi token…
              </motion.p>
            )}
            {result && (
              <motion.p
                key="valid"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-sage px-4 py-2 text-sm font-bold text-moss"
                role="status"
              >
                <CheckCircle size={19} weight="fill" /> {result.bookingCode}{" "}
                valid · {result.status}
              </motion.p>
            )}
            {errorCode && (
              <motion.p
                key="err"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#f6d9c8] px-4 py-2 text-sm font-bold text-[#8a3a20]"
                role="alert"
              >
                <WarningCircle size={19} weight="fill" />{" "}
                {errorCode.replace(/_/g, " ")}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
        <form className="mt-4 flex gap-2" onSubmit={submit}>
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-[10px] border border-line px-3.5 py-3">
            <MagnifyingGlass size={17} className="shrink-0 text-ink/40" />
            <span className="sr-only">Token QR tiket</span>
            <input
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setErrorCode(null);
                setResult(null);
              }}
              placeholder="Tempel token QR di sini…"
              className="min-w-0 flex-1 bg-transparent font-mono text-xs outline-none placeholder:font-sans placeholder:text-ink/35"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="shrink-0 rounded-[10px] bg-ink px-4 py-3 text-sm font-bold text-paper disabled:opacity-60"
          >
            Verifikasi
          </button>
        </form>
        <p className="mt-3 text-xs leading-5 text-ink/45">
          Dioptimalkan satu tangan & kamera HP. Setiap scan tercatat untuk
          audit.
        </p>
      </div>

      <div className="h-fit rounded-[16px] bg-ink p-6 text-paper">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-coral">
          Check-in hari ini
        </p>
        {today.isLoading ? (
          <p className="mt-3 animate-pulse text-sm text-paper/50">Memuat…</p>
        ) : todays.length === 0 ? (
          <p className="mt-3 text-sm text-paper/60">
            Tidak ada booking untuk hari ini.
          </p>
        ) : (
          <>
            <p className="mt-2 text-4xl font-bold tracking-tight">
              {checkedIn}{" "}
              <span className="text-base font-medium text-paper/50">
                / {todays.length} booking · {totalPax} pax
              </span>
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-paper/15">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${todays.length ? (checkedIn / todays.length) * 100 : 0}%`,
                }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                className="h-full rounded-full bg-coral"
              />
            </div>
            <div className="mt-6 space-y-3 border-t border-paper/15 pt-5 text-sm">
              {todays.slice(0, 6).map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="text-paper/60">
                    {b.slot_start} · {b.booker_name}
                  </span>
                  <strong className="font-mono text-xs">
                    {b.status.replace(/_/g, " ")}
                  </strong>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

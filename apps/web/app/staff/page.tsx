"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Metric,
  WorkspaceHeader,
  WorkspaceShell,
} from "../components/workspace-shell";
import { useAuth } from "../components/providers";
import { api } from "../lib/api";

interface BookingLite {
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

export default function StaffOverviewPage() {
  const { authenticated, token } = useAuth();
  const query = useQuery({
    queryKey: ["staff-today"],
    queryFn: () =>
      api.get<{ bookings: BookingLite[] }>("/vendor/bookings", token),
    enabled: Boolean(authenticated),
  });
  const all = query.data?.bookings ?? [];
  const todays = all
    .filter(
      (b) =>
        b.booking_date.slice(0, 10) === todayISO() &&
        ["CONFIRMED", "CHECKED_IN", "COMPLETED"].includes(b.status),
    )
    .sort((a, b) => a.slot_start.localeCompare(b.slot_start));
  const checked = todays.filter((b) =>
    ["CHECKED_IN", "COMPLETED"].includes(b.status),
  ).length;
  const pax = todays.reduce((a, b) => a + b.participant_count, 0);
  const next = todays.find(
    (b) => !["CHECKED_IN", "COMPLETED", "CANCELLED"].includes(b.status),
  );

  return (
    <WorkspaceShell role="staff" current="/staff">
      <WorkspaceHeader
        eyebrow="Staff lapangan · daily schedule"
        title="Tugas hari ini."
        description="Hanya yang kamu butuhkan di lapangan: jadwal, daftar booking, scan tiket, dan verifikasi peserta."
      />
      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        <Metric
          label="Check-in selesai"
          value={query.isLoading ? "…" : `${checked}/${todays.length}`}
          hint={`${pax} peserta hari ini`}
        />
        <Metric
          label="Slot berikutnya"
          value={next ? next.slot_start : "-"}
          hint={next?.activity?.title ?? "Tidak ada"}
        />
        <Metric
          label=" Perlu aksi"
          value={query.isLoading ? "…" : String(todays.length - checked)}
          hint="belum check-in"
        />
      </div>
      <div className="mt-8 rounded-[12px] border border-line bg-paper">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="font-bold">Jadwal keberangkatan</h2>
          <Link
            href="/staff/check-in"
            className="rounded-[10px] bg-ink px-4 py-2.5 text-xs font-bold text-paper"
          >
            Buka scanner
          </Link>
        </div>
        {query.isLoading ? (
          <div
            className="space-y-2 px-5 py-4"
            aria-busy="true"
            aria-label="Memuat jadwal"
          >
            {[0, 1].map((i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-[10px] bg-soft"
              />
            ))}
          </div>
        ) : todays.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-ink/55">
            Tidak ada keberangkatan hari ini.
          </p>
        ) : (
          <div className="divide-y divide-line">
            {todays.map((s) => {
              const done = ["CHECKED_IN", "COMPLETED"].includes(s.status);
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 px-5 py-3.5"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-9 w-14 items-center justify-center rounded-[10px] text-xs font-black ${done ? "bg-sage text-moss" : "bg-soft text-ink"}`}
                    >
                      {s.slot_start}
                    </span>
                    <div>
                      <p className="text-sm font-bold">{s.activity?.title}</p>
                      <p className="mt-0.5 text-xs text-ink/50">
                        {s.booker_name} · {s.participant_count} pax
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-bold ${done ? "text-moss" : "text-ink/40"}`}
                  >
                    {done ? "SELESAI" : s.status.replace(/_/g, " ")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <p className="mt-4 text-xs leading-5 text-ink/45">
        Permission staff: bookings · daily schedule · ticket scanning · check-in
        · participant verification. Revenue, payout, dan pengaturan hanya untuk
        owner.
      </p>
    </WorkspaceShell>
  );
}

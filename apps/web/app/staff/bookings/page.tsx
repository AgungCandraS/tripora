"use client";

import { useQuery } from "@tanstack/react-query";
import { StatusPill, WorkspaceHeader, WorkspaceShell } from "../../components/workspace-shell";
import { useAuth } from "../../components/providers";
import { api } from "../../lib/api";

interface Row {
  id: string;
  booking_code: string;
  booker_name: string;
  booking_date: string;
  slot_start: string;
  participant_count: number;
  status: string;
  activity?: { title: string };
}

export default function StaffBookingsPage() {
  const { token } = useAuth();
  const query = useQuery({
    queryKey: ["staff-bookings"],
    queryFn: () => api.get<{ bookings: Row[] }>("/vendor/bookings", token),
    enabled: Boolean(token),
  });
  const rows = [...(query.data?.bookings ?? [])].sort((a, b) =>
    `${a.booking_date}${a.slot_start}`.localeCompare(`${b.booking_date}${b.slot_start}`)
  );

  return (
    <WorkspaceShell role="staff" current="/staff/bookings">
      <WorkspaceHeader
        eyebrow="Bookings · read-only"
        title="Daftar peserta."
        description="Siapkan slot dan kebutuhan operasional. Perubahan status hanya lewat scan check-in." />
      {query.isLoading ? (
        <div className="mt-8 space-y-3" aria-busy="true" aria-label="Memuat booking">
          {[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-[12px] bg-paper" />)}
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-8 rounded-[12px] border border-dashed border-line bg-paper px-5 py-10 text-center text-sm text-ink/55">
          Belum ada booking untuk vendor ini.
        </p>
      ) : (
        <div className="mt-8 space-y-3">
          {rows.map((r) => (
            <article key={r.id} className="grid gap-3 rounded-[12px] border border-line bg-paper p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-5">
              <span className="flex h-11 w-16 items-center justify-center rounded-[10px] bg-soft text-sm font-black">
                {r.slot_start}
              </span>
              <div>
                <p className="text-sm font-bold">{r.booker_name} <span className="font-mono text-xs font-medium text-ink/45">· {r.booking_code}</span></p>
                <p className="mt-0.5 text-xs text-ink/55">{r.activity?.title} · {r.booking_date.slice(0, 10)} · {r.participant_count} peserta</p>
              </div>
              <StatusPill status={r.status} />
            </article>
          ))}
        </div>
      )}
    </WorkspaceShell>
  );
}

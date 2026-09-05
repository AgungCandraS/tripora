"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Check } from "@phosphor-icons/react";
import { WorkspaceHeader, WorkspaceShell } from "../../components/workspace-shell";
import { useAuth } from "../../components/providers";
import { api } from "../../lib/api";

interface BookingWithPax {
  id: string;
  booking_code: string;
  booker_name: string;
  status: string;
  activity?: { title: string };
  participants?: Array<{ id: string; name: string; age: number | null }>;
}

export default function StaffVerifyPage() {
  const { token } = useAuth();
  const [verified, setVerified] = useState<Record<string, boolean>>({});

  const query = useQuery({
    queryKey: ["staff-bookings"],
    queryFn: () => api.get<{ bookings: BookingWithPax[] }>("/vendor/bookings", token),
    enabled: Boolean(token),
  });

  const rows = useMemo(() => {
    const out: Array<{ key: string; name: string; age: number | null; code: string; activity: string }> = [];
    for (const b of query.data?.bookings ?? []) {
      if (b.participants?.length) {
        for (const p of b.participants) {
          out.push({ key: `${b.id}:${p.id}`, name: p.name, age: p.age, code: b.booking_code, activity: b.activity?.title ?? "" });
        }
      } else {
        out.push({ key: `${b.id}:booker`, name: `${b.booker_name} (pemesan)`, age: null, code: b.booking_code, activity: b.activity?.title ?? "" });
      }
    }
    return out;
  }, [query.data]);

  const done = rows.filter((r) => verified[r.key]).length;

  return (
    <WorkspaceShell role="staff" current="/staff/verify">
      <WorkspaceHeader
        eyebrow="Participant verification"
        title="Verifikasi peserta."
        description="Nama diambil dari data booking asli. Centang manual per peserta saat cek fisik — status check-in resmi tetap lewat scan QR." />
      {query.isLoading ? (
        <div className="mt-6 h-32 animate-pulse rounded-[12px] bg-paper" aria-busy="true" aria-label="Memuat peserta" />
      ) : rows.length === 0 ? (
        <p className="mt-6 rounded-[12px] border border-dashed border-line bg-paper px-5 py-10 text-center text-sm text-ink/55">
          Belum ada peserta dari booking vendor ini.
        </p>
      ) : (
        <>
          <p className="mt-6 text-sm font-bold" role="status">{done}/{rows.length} terverifikasi manual</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-moss transition-all" style={{ width: `${(done / rows.length) * 100}%` }} />
          </div>
          <div className="mt-5 space-y-3">
            {rows.map((p) => (
              <div key={p.key} className="flex items-center justify-between gap-3 rounded-[12px] border border-line bg-paper px-4 py-3.5 sm:px-5">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={Boolean(verified[p.key])}
                    aria-label={`Verifikasi ${p.name}`}
                    onClick={() => setVerified((v) => ({ ...v, [p.key]: !v[p.key] }))}
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition ${verified[p.key] ? "border-moss bg-moss text-paper" : "border-line text-transparent"}`}
                  >
                    <Check size={15} weight="bold" />
                  </button>
                  <div>
                    <p className="text-sm font-bold">{p.name}{p.age !== null && <span className="text-xs font-medium text-ink/45"> · {p.age} th</span>}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-ink/45">{p.code} · {p.activity}</p>
                  </div>
                </div>
                <span className={`text-[11px] font-bold ${verified[p.key] ? "text-moss" : "text-ink/40"}`}>
                  {verified[p.key] ? "OK" : "CEK"}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </WorkspaceShell>
  );
}

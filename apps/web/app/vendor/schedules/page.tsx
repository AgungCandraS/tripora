"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  WorkspaceHeader,
  WorkspaceShell,
} from "../../components/workspace-shell";
import { useAuth } from "../../components/providers";
import { ApiError, api } from "../../lib/api";

const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

interface Sched {
  id: string;
  day_of_week: number | null;
  specific_date: string | null;
  start_time: string;
  end_time: string;
  capacity: number;
  status: string;
  package: {
    id: string;
    name: string;
    activity: { id: string; title: string };
  };
}

export default function VendorSchedulesPage() {
  const { authenticated, token } = useAuth();
  const queryClient = useQueryClient();
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const query = useQuery({
    queryKey: ["vendor-calendar"],
    queryFn: () => api.get<Sched[]>("/vendor/calendar", token),
    enabled: Boolean(authenticated),
  });
  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { title: string; pkg: string; items: Sched[] }
    >();
    for (const s of query.data ?? []) {
      const key = `${s.package.activity.id}:${s.package.id}`;
      if (!map.has(key))
        map.set(key, {
          title: s.package.activity.title,
          pkg: s.package.name,
          items: [],
        });
      map.get(key)!.items.push(s);
    }
    return [...map.values()];
  }, [query.data]);

  async function save(id: string) {
    const raw = edits[id];
    if (raw === undefined) return;
    setError("");
    try {
      await api.patch(
        `/vendor/schedules/${id}`,
        { capacity: Number(raw) },
        token,
      );
      setEdits((m) => {
        const n = { ...m };
        delete n[id];
        return n;
      });
      await queryClient.invalidateQueries({ queryKey: ["vendor-calendar"] });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Gagal menyimpan.");
    }
  }

  return (
    <WorkspaceShell role="vendor" current="/vendor/schedules">
      <WorkspaceHeader
        eyebrow="Schedule & capacity"
        title="Jadwal & kapasitas."
        description="Atur kapasitas setiap jadwal dan pantau jumlah peserta yang sudah memesan."
      />
      {error && (
        <p
          className="mt-4 rounded-[10px] bg-[#f6d9c8] px-4 py-3 text-sm font-semibold text-[#8a3a20]"
          role="alert"
        >
          {error}
        </p>
      )}
      {query.isLoading ? (
        <div
          className="mt-6 space-y-3"
          aria-busy="true"
          aria-label="Memuat jadwal"
        >
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-[12px] bg-paper"
            />
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <div className="mt-6 rounded-[12px] border border-dashed border-line bg-paper px-5 py-10 text-center text-sm text-ink/55">
          Belum ada jadwal. Tambah slot dari{" "}
          <Link
            href="/vendor/activities"
            className="font-bold text-coral-dark underline underline-offset-4"
          >
            editor activity
          </Link>
          .
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {grouped.map((g) => (
            <section
              key={`${g.title}:${g.pkg}`}
              className="overflow-hidden rounded-[12px] border border-line bg-paper"
            >
              <div className="border-b border-line px-5 py-3.5">
                <h2 className="text-sm font-bold">{g.title}</h2>
                <p className="mt-0.5 text-xs text-ink/50">{g.pkg}</p>
              </div>
              <div className="divide-y divide-line">
                {g.items.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-wrap items-center gap-3 px-5 py-3"
                  >
                    <span className="min-w-24 text-sm font-bold">
                      {s.start_time}–{s.end_time}
                    </span>
                    <span className="text-xs text-ink/50">
                      {s.specific_date
                        ? s.specific_date.slice(0, 10)
                        : s.day_of_week === null
                          ? "semua hari"
                          : DAYS[s.day_of_week]}
                    </span>
                    <label className="ml-auto flex items-center gap-2 text-xs font-semibold">
                      Kapasitas
                      <input
                        type="number"
                        min={1}
                        max={500}
                        value={edits[s.id] ?? String(s.capacity)}
                        onChange={(e) =>
                          setEdits((m) => ({ ...m, [s.id]: e.target.value }))
                        }
                        className="w-20 rounded-[8px] border border-line bg-transparent px-2 py-1.5 font-mono text-sm outline-none focus:border-coral-dark"
                      />
                    </label>
                    {edits[s.id] !== undefined &&
                      Number(edits[s.id]) !== s.capacity && (
                        <button
                          type="button"
                          onClick={() => save(s.id)}
                          className="rounded-[8px] bg-ink px-3.5 py-2 text-xs font-bold text-paper"
                        >
                          Simpan
                        </button>
                      )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </WorkspaceShell>
  );
}

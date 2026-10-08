"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Plus } from "@phosphor-icons/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  StatusPill,
  WorkspaceHeader,
  WorkspaceShell,
} from "../../../components/workspace-shell";
import { useAuth } from "../../../components/providers";
import { ApiError, api, formatIDR } from "../../../lib/api";
import type { ApiActivity, ApiPackage } from "../../../lib/types";

interface EditorActivity extends ApiActivity {
  packages: Array<
    ApiPackage & {
      schedules?: Array<{
        id: string;
        start_time: string;
        end_time: string;
        capacity: number;
        day_of_week: number | null;
      }>;
    }
  >;
}

export default function VendorActivityEditorPage() {
  const params = useParams<{ slug: string }>();
  const id = params.slug;
  const { authenticated, token } = useAuth();
  const queryClient = useQueryClient();
  const [pkgName, setPkgName] = useState("");
  const [pkgPrice, setPkgPrice] = useState("");
  const [pkgMinutes, setPkgMinutes] = useState("60");
  const [error, setError] = useState("");
  const [capEdits, setCapEdits] = useState<Record<string, string>>({});
  const [slotPkg, setSlotPkg] = useState("");
  const [slotDay, setSlotDay] = useState("all");
  const [slotStart, setSlotStart] = useState("08:00");
  const [slotEnd, setSlotEnd] = useState("10:00");
  const [slotCap, setSlotCap] = useState("10");

  const query = useQuery({
    queryKey: ["vendor-activity", id],
    queryFn: () => api.get<EditorActivity>(`/vendor/activities/${id}`, token),
    enabled: Boolean(authenticated && id),
  });
  const activity = query.data ?? null;
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["vendor-activity", id] });

  async function addPackage(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!activity) return;
    setError("");
    try {
      await api.post(
        "/vendor/packages",
        {
          activityId: activity.id,
          name: pkgName.trim(),
          base_price: Number(pkgPrice),
          duration_minutes: Number(pkgMinutes) || 60,
        },
        token,
      );
      setPkgName("");
      setPkgPrice("");
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menambah paket.");
    }
  }

  async function saveCapacity(scheduleId: string) {
    const raw = capEdits[scheduleId];
    if (raw === undefined) return;
    setError("");
    try {
      await api.patch(
        `/vendor/schedules/${scheduleId}`,
        { capacity: Number(raw) },
        token,
      );
      setCapEdits((m) => {
        const next = { ...m };
        delete next[scheduleId];
        return next;
      });
      await refresh();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Gagal menyimpan kapasitas.",
      );
    }
  }

  async function addSlot(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!slotPkg) return;
    setError("");
    try {
      const days =
        slotDay === "all" ? [0, 1, 2, 3, 4, 5, 6] : [Number(slotDay)];
      for (const d of days) {
        await api.post(
          "/vendor/calendar/schedules",
          {
            packageId: slotPkg,
            dayOfWeek: d,
            startTime: slotStart,
            endTime: slotEnd,
            capacity: Number(slotCap) || 10,
          },
          token,
        );
      }
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menambah slot.");
    }
  }

  async function submitReview() {
    if (!activity) return;
    setError("");
    try {
      await api.post(`/vendor/activities/${activity.id}/submit`, {}, token);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal submit.");
    }
  }

  return (
    <WorkspaceShell role="vendor" current="/vendor/activities">
      {query.isLoading ? (
        <div
          className="animate-pulse space-y-4"
          aria-busy="true"
          aria-label="Memuat editor"
        >
          <div className="h-10 w-1/2 rounded-[10px] bg-paper" />
          <div className="h-64 rounded-[16px] bg-paper" />
        </div>
      ) : query.isError || !activity ? (
        <div>
          <WorkspaceHeader
            eyebrow="Listings · editor"
            title="Tidak ketemu."
            description="Activity ini bukan milik vendormu atau sudah dihapus."
          />
          <Link
            href="/vendor/activities"
            className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-coral-dark underline underline-offset-4"
          >
            <ArrowLeft size={15} /> Semua aktivitas
          </Link>
        </div>
      ) : (
        <>
          <WorkspaceHeader
            eyebrow="Listings · editor"
            title={activity.title}
            description="Kelola paket, kapasitas slot, lalu submit untuk moderasi admin."
          />
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link
              href="/vendor/activities"
              className="inline-flex items-center gap-2 text-sm font-bold text-coral-dark underline underline-offset-4"
            >
              <ArrowLeft size={15} /> Semua aktivitas
            </Link>
            <StatusPill status={activity.status} />
            {activity.status === "DRAFT" && (
              <button
                type="button"
                onClick={submitReview}
                className="inline-flex items-center gap-1.5 rounded-[10px] bg-coral px-4 py-2.5 text-xs font-bold text-ink hover:bg-[#ed8c6b]"
              >
                <Check size={15} weight="bold" /> Submit untuk review
              </button>
            )}
          </div>
          {error && (
            <p
              className="mt-4 rounded-[10px] bg-[#f6d9c8] px-4 py-3 text-sm font-semibold text-[#8a3a20]"
              role="alert"
            >
              {error}
            </p>
          )}

          <h2 className="mt-8 text-lg font-bold">
            Paket ({activity.packages.length})
          </h2>
          <div className="mt-4 space-y-3">
            {activity.packages.map((p) => (
              <div
                key={p.id}
                className="rounded-[12px] border border-line bg-paper p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold">{p.name}</p>
                  <p className="text-sm font-bold">
                    {formatIDR(p.base_price)}{" "}
                    <span className="text-xs font-medium text-ink/50">
                      · {p.duration_minutes ?? "-"} mnt · {p.min_participants}–
                      {p.max_participants} pax
                    </span>
                  </p>
                </div>
                {(p.schedules ?? []).length > 0 && (
                  <div className="mt-3 space-y-2 border-t border-line pt-3">
                    {p.schedules!.map((s) => (
                      <div
                        key={s.id}
                        className="flex flex-wrap items-center gap-2 text-sm"
                      >
                        <span className="min-w-28 font-bold">
                          {s.start_time}–{s.end_time}
                        </span>
                        <span className="text-xs text-ink/50">
                          {s.day_of_week === null || s.day_of_week === undefined
                            ? "semua hari"
                            : ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"][
                                s.day_of_week
                              ]}
                        </span>
                        <label className="ml-auto flex items-center gap-2 text-xs font-semibold">
                          Kapasitas
                          <input
                            type="number"
                            min={1}
                            max={200}
                            value={capEdits[s.id] ?? String(s.capacity)}
                            onChange={(e) =>
                              setCapEdits((m) => ({
                                ...m,
                                [s.id]: e.target.value,
                              }))
                            }
                            className="w-20 rounded-[8px] border border-line bg-transparent px-2 py-1.5 font-mono text-sm outline-none focus:border-coral-dark"
                          />
                        </label>
                        {capEdits[s.id] !== undefined &&
                          Number(capEdits[s.id]) !== s.capacity && (
                            <button
                              type="button"
                              onClick={() => saveCapacity(s.id)}
                              className="rounded-[8px] bg-ink px-3 py-1.5 text-xs font-bold text-paper"
                            >
                              Simpan
                            </button>
                          )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {activity.packages.length === 0 && (
              <p className="rounded-[12px] border border-dashed border-line bg-paper px-5 py-8 text-center text-sm text-ink/55">
                Belum ada paket — submit butuh minimal 1 paket.
              </p>
            )}
          </div>

          <form
            onSubmit={addPackage}
            className="mt-4 grid gap-2 rounded-[12px] border border-line bg-paper p-4 sm:grid-cols-[1fr_0.6fr_0.6fr_auto] sm:p-5"
          >
            <input
              required
              value={pkgName}
              onChange={(e) => setPkgName(e.target.value)}
              placeholder="Nama paket baru…"
              className="rounded-[10px] border border-line bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-coral-dark"
            />
            <input
              required
              inputMode="numeric"
              value={pkgPrice}
              onChange={(e) => setPkgPrice(e.target.value)}
              placeholder="Harga IDR"
              className="rounded-[10px] border border-line bg-transparent px-3.5 py-2.5 font-mono text-sm outline-none focus:border-coral-dark"
            />
            <input
              inputMode="numeric"
              value={pkgMinutes}
              onChange={(e) => setPkgMinutes(e.target.value)}
              placeholder="Menit"
              className="rounded-[10px] border border-line bg-transparent px-3.5 py-2.5 font-mono text-sm outline-none focus:border-coral-dark"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 rounded-[10px] bg-ink px-4 py-2.5 text-sm font-bold text-paper"
            >
              <Plus size={15} weight="bold" /> Tambah
            </button>
          </form>
          <p className="mt-6 text-sm font-bold">Tambah slot jadwal</p>
          <form
            onSubmit={addSlot}
            className="mt-2 grid gap-2 rounded-[12px] border border-line bg-paper p-4 sm:grid-cols-[1.2fr_0.8fr_0.7fr_0.7fr_0.6fr_auto] sm:p-5"
          >
            <select
              required
              value={slotPkg}
              onChange={(e) => setSlotPkg(e.target.value)}
              className="rounded-[10px] border border-line bg-transparent px-3 py-2.5 text-sm outline-none focus:border-coral-dark"
              aria-label="Paket"
            >
              <option value="">Pilih paket…</option>
              {activity.packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              value={slotDay}
              onChange={(e) => setSlotDay(e.target.value)}
              className="rounded-[10px] border border-line bg-transparent px-3 py-2.5 text-sm outline-none focus:border-coral-dark"
              aria-label="Hari"
            >
              <option value="all">Semua hari</option>
              {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
            <input
              type="time"
              required
              value={slotStart}
              onChange={(e) => setSlotStart(e.target.value)}
              className="rounded-[10px] border border-line bg-transparent px-3 py-2.5 font-mono text-sm outline-none focus:border-coral-dark"
              aria-label="Mulai"
            />
            <input
              type="time"
              required
              value={slotEnd}
              onChange={(e) => setSlotEnd(e.target.value)}
              className="rounded-[10px] border border-line bg-transparent px-3 py-2.5 font-mono text-sm outline-none focus:border-coral-dark"
              aria-label="Selesai"
            />
            <input
              type="number"
              min={1}
              max={200}
              required
              value={slotCap}
              onChange={(e) => setSlotCap(e.target.value)}
              className="rounded-[10px] border border-line bg-transparent px-3 py-2.5 font-mono text-sm outline-none focus:border-coral-dark"
              aria-label="Kapasitas"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 rounded-[10px] bg-ink px-4 py-2.5 text-sm font-bold text-paper"
            >
              <Plus size={15} weight="bold" /> Slot
            </button>
          </form>
        </>
      )}
    </WorkspaceShell>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Plus } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { WorkspaceHeader, WorkspaceShell } from "../../../components/workspace-shell";
import { useAuth } from "../../../components/providers";
import { ApiError, api } from "../../../lib/api";
import { Field, inputClass } from "../../../components/form";
import type { ApiCategory, ApiDestination } from "../../../lib/types";

export default function NewActivityPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [short, setShort] = useState("");
  const [meeting, setMeeting] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: destinations } = useQuery({
    queryKey: ["destinations"],
    queryFn: () => api.get<ApiDestination[]>("/destinations"),
  });
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<ApiCategory[]>("/categories"),
  });

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const created = await api.post<{ id: string }>("/vendor/activities", {
        title: title.trim(),
        destinationId,
        short_description: short.trim() || undefined,
        meeting_point: meeting.trim() || undefined,
        categoryIds: categoryId ? [categoryId] : [],
      }, token);
      router.push(`/vendor/activities/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan draft.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <WorkspaceShell role="vendor" current="/vendor/activities">
      <WorkspaceHeader
        eyebrow="Listings · baru"
        title="Buat activity."
        description="Draft tersimpan sebagai DRAFT. Tambah paket + jadwal di editor, lalu submit untuk moderasi." />
      <Link href="/vendor/activities" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-coral-dark underline underline-offset-4">
        <ArrowLeft size={15} /> Semua aktivitas
      </Link>
      <form onSubmit={submit} className="mt-6 grid max-w-[720px] gap-5 rounded-[16px] border border-line bg-paper p-6 sm:grid-cols-2 sm:p-8">
        {error && <p className="rounded-[10px] bg-[#f6d9c8] px-4 py-3 text-sm font-semibold text-[#8a3a20] sm:col-span-2" role="alert">{error}</p>}
        <Field label="Judul activity" span>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="cth. ATV Adventure Pangalengan" className={inputClass} />
        </Field>
        <Field label="Destination">
          <select required value={destinationId} onChange={(e) => setDestinationId(e.target.value)} className={inputClass}>
            <option value="">Pilih destinasi…</option>
            {(destinations ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
        <Field label="Kategori utama" hint="opsional">
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass}>
            <option value="">Tanpa kategori</option>
            {(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Deskripsi singkat" span>
          <textarea required rows={3} value={short} onChange={(e) => setShort(e.target.value)} placeholder="Highlight pengalaman dalam 1–2 kalimat…" className={`${inputClass} resize-none`} />
        </Field>
        <Field label="Meeting point" span>
          <input value={meeting} onChange={(e) => setMeeting(e.target.value)} placeholder="cth. Basecamp, patokan…" className={inputClass} />
        </Field>
        <div className="sm:col-span-2">
          <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-[10px] bg-ink px-5 py-3 text-sm font-bold text-paper disabled:opacity-60">
            <Plus size={16} weight="bold" /> {busy ? "Menyimpan…" : "Simpan draft"}
          </button>
        </div>
      </form>
    </WorkspaceShell>
  );
}

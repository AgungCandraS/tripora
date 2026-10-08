"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import {
  WorkspaceHeader,
  WorkspaceShell,
} from "../../components/workspace-shell";
import { useAuth } from "../../components/providers";
import { ApiError, api } from "../../lib/api";

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function AdminCategoriesPage() {
  const { authenticated, token } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [editing, setEditing] = useState<Category | null>(null);
  const [error, setError] = useState("");

  const query = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => api.get<Category[]>("/admin/categories", token),
    enabled: Boolean(authenticated),
  });
  const rows = query.data ?? [];
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-categories"] });

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    try {
      if (editing) {
        await api.patch(
          `/admin/categories/${editing.id}`,
          { name, slug },
          token,
        );
      } else {
        await api.post("/admin/categories", { name, slug }, token);
      }
      setName("");
      setSlug("");
      setEditing(null);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan.");
    }
  }

  async function remove(id: string) {
    if (
      !window.confirm(
        "Hapus kategori ini? Kategori yang dipakai activity akan dilepas dulu.",
      )
    )
      return;
    setError("");
    try {
      await api.del(`/admin/categories/${id}`, token);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menghapus.");
    }
  }

  return (
    <WorkspaceShell role="admin" current="/admin/categories">
      <WorkspaceHeader
        eyebrow="Moderasi kategori"
        title="Kategori aktivitas."
        description="Kelola kategori untuk memudahkan pengunjung menemukan aktivitas yang sesuai."
      />
      {error && (
        <p
          className="mt-4 rounded-[10px] bg-[#f6d9c8] px-4 py-3 text-sm font-semibold text-[#8a3a20]"
          role="alert"
        >
          {error}
        </p>
      )}
      <form
        onSubmit={submit}
        className="mt-7 flex flex-wrap items-end gap-3 rounded-[12px] border border-line bg-paper p-5"
      >
        <label className="min-w-40 flex-1">
          <span className="text-xs font-bold uppercase tracking-[0.1em] text-ink/45">
            Nama
          </span>
          <input
            required
            minLength={3}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="cth. Outbound"
            className="mt-2 w-full rounded-[10px] border border-line bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-coral-dark"
          />
        </label>
        <label className="min-w-40 flex-1">
          <span className="text-xs font-bold uppercase tracking-[0.1em] text-ink/45">
            Slug
          </span>
          <input
            required
            minLength={2}
            value={slug}
            onChange={(e) =>
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-"))
            }
            placeholder="cth. outbound"
            className="mt-2 w-full rounded-[10px] border border-line bg-transparent px-3.5 py-2.5 font-mono text-sm outline-none focus:border-coral-dark"
          />
        </label>
        <button
          type="submit"
          className="rounded-[10px] bg-ink px-5 py-2.5 text-sm font-bold text-paper"
        >
          {editing ? "Simpan" : "Tambah"}
        </button>
        {editing && (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setName("");
              setSlug("");
            }}
            className="rounded-[10px] border border-line px-5 py-2.5 text-sm font-bold"
          >
            Batal
          </button>
        )}
      </form>
      <div className="mt-5 space-y-2">
        {rows.map((c) => (
          <div
            key={c.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-line bg-paper px-5 py-3.5"
          >
            <div>
              <p className="text-sm font-bold">{c.name}</p>
              <p className="font-mono text-xs text-ink/45">
                /categories/{c.slug}
              </p>
            </div>
            <span className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditing(c);
                  setName(c.name);
                  setSlug(c.slug);
                }}
                className="text-sm font-bold text-ink underline underline-offset-4"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => remove(c.id)}
                className="text-sm font-bold text-coral-dark underline underline-offset-4"
              >
                Hapus
              </button>
            </span>
          </div>
        ))}
      </div>
    </WorkspaceShell>
  );
}

"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Plus } from "@phosphor-icons/react";
import { FormEvent, useState } from "react";
import {
  StatusPill,
  WorkspaceHeader,
  WorkspaceShell,
} from "../../components/workspace-shell";
import { useAuth } from "../../components/providers";
import { ApiError, api } from "../../lib/api";
import { Field, inputClass } from "../../components/form";

interface CmsPage {
  id: string;
  slug: string;
  title: string;
  body: string;
  status: string;
}

export default function AdminCmsPage() {
  const { authenticated, token } = useAuth();
  const queryClient = useQueryClient();
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [editing, setEditing] = useState<CmsPage | null>(null);
  const [error, setError] = useState("");

  const query = useQuery({
    queryKey: ["admin-cms"],
    queryFn: () => api.get<CmsPage[]>("/admin/cms/pages", token),
    enabled: Boolean(authenticated),
  });
  const pages = query.data ?? [];
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-cms"] });

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!slug.trim() || !title.trim()) return;
    setError("");
    try {
      await api.post(
        "/admin/cms/pages",
        { slug: slug.trim(), title: title.trim(), body },
        token,
      );
      setSlug("");
      setTitle("");
      setBody("");
      await refresh();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Gagal membuat halaman.",
      );
    }
  }

  async function saveEdit() {
    if (!editing) return;
    try {
      await api.put(
        `/admin/cms/pages/${editing.id}`,
        { title: editing.title, body: editing.body },
        token,
      );
      setEditing(null);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan.");
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Hapus halaman ini?")) return;
    try {
      await api.del(`/admin/cms/pages/${id}`, token);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menghapus.");
    }
  }

  return (
    <WorkspaceShell role="admin" current="/admin/cms">
      <WorkspaceHeader
        eyebrow="CMS basic"
        title="Konten & halaman."
        description="Kelola halaman informasi dan konten editorial yang ditampilkan kepada pengunjung."
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
        onSubmit={create}
        className="mt-8 grid max-w-[720px] gap-3 rounded-[16px] border border-line bg-paper p-5 sm:p-6"
      >
        <p className="flex items-center gap-2 text-sm font-bold">
          <Plus size={16} weight="bold" /> Halaman baru
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Slug (unik)">
            <input
              required
              value={slug}
              onChange={(e) =>
                setSlug(
                  e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
                )
              }
              placeholder="cth. tentang-tripora"
              className={`${inputClass} font-mono`}
            />
          </Field>
          <Field label="Judul">
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Judul halaman"
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="Isi" span>
          <textarea
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Konten halaman…"
            className={`${inputClass} resize-none`}
          />
        </Field>
        <div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-[10px] bg-ink px-5 py-3 text-sm font-bold text-paper"
          >
            <Check size={16} weight="bold" /> Publish halaman
          </button>
        </div>
      </form>

      <div className="mt-6 max-w-[720px] space-y-3">
        {query.isLoading ? (
          <div
            className="h-20 animate-pulse rounded-[12px] bg-paper"
            aria-busy="true"
            aria-label="Memuat halaman"
          />
        ) : pages.length === 0 ? (
          <p className="rounded-[12px] border border-dashed border-line bg-paper px-5 py-10 text-center text-sm text-ink/55">
            Belum ada halaman CMS.
          </p>
        ) : (
          pages.map((p) => (
            <div
              key={p.id}
              className="rounded-[12px] border border-line bg-paper px-5 py-4"
            >
              {editing?.id === p.id ? (
                <div className="grid gap-3">
                  <input
                    value={editing.title}
                    onChange={(e) =>
                      setEditing({ ...editing, title: e.target.value })
                    }
                    className={inputClass}
                    aria-label="Judul"
                  />
                  <textarea
                    rows={3}
                    value={editing.body}
                    onChange={(e) =>
                      setEditing({ ...editing, body: e.target.value })
                    }
                    className={`${inputClass} resize-none`}
                    aria-label="Isi"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={saveEdit}
                      className="rounded-[8px] bg-ink px-4 py-2 text-xs font-bold text-paper"
                    >
                      Simpan
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="rounded-[8px] border border-line px-4 py-2 text-xs font-bold"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <p className="font-bold">{p.title}</p>
                      <StatusPill
                        status={p.status === "PUBLISHED" ? "PAID" : "DRAFT"}
                      />
                    </div>
                    <p className="mt-0.5 font-mono text-xs text-ink/50">
                      /{p.slug}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(p)}
                      className="rounded-[8px] border border-line px-3.5 py-2 text-xs font-bold hover:border-ink/40"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(p.id)}
                      className="rounded-[8px] border border-line px-3.5 py-2 text-xs font-bold hover:border-coral-dark hover:text-coral-dark"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </WorkspaceShell>
  );
}

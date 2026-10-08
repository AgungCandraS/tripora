"use client";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  MagnifyingGlass,
  MapPin,
  ArrowUpRight,
} from "@phosphor-icons/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { placeCategories, type PlaceResults } from "../lib/place-types";
import { PlaceCard, readSavedPlaces } from "./place-card";

export function PlaceExplorer({ savedOnly = false }: { savedOnly?: boolean }) {
  const params = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [area, setArea] = useState(params.get("area") ?? "");
  const [saved, setSaved] = useState<string[] | null>(savedOnly ? null : []);
  useEffect(() => {
    setQ(params.get("q") ?? "");
    setArea(params.get("area") ?? "");
  }, [params]);
  useEffect(() => {
    if (!savedOnly) return;
    const sync = () => setSaved(readSavedPlaces());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("tripora-saved", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("tripora-saved", sync);
    };
  }, [savedOnly]);
  const apiParams = new URLSearchParams(params.toString());
  if (savedOnly) apiParams.set("ids", (saved ?? []).join(","));
  const query = useQuery({
    queryKey: ["places", apiParams.toString()],
    enabled: saved !== null,
    queryFn: async () => {
      const requestParams = new URLSearchParams(apiParams);
      requestParams.delete("ids");
      const result = savedOnly
        ? await fetch(`/api/places?${requestParams}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: saved ?? [] }),
          })
        : await fetch(`/api/places?${apiParams}`);
      if (!result.ok) throw new Error("Daftar tempat belum bisa dimuat.");
      return result.json() as Promise<PlaceResults>;
    },
  });
  function update(values: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!("page" in values)) next.delete("page");
    router.push(
      `${savedOnly ? "/saved" : "/explore"}${next.size ? `?${next}` : ""}`,
      { scroll: false },
    );
  }
  function search(event: FormEvent) {
    event.preventDefault();
    update({ q: q.trim(), area });
  }
  const category = params.get("category") ?? "";
  const page = query.data?.page ?? 1;
  const pages = Math.ceil((query.data?.total ?? 0) / 12);
  return (
    <section id="content" className="public-container pb-20 pt-10 sm:pt-16">
      <div
        data-motion
        className="flex flex-wrap items-end justify-between gap-5"
      >
        <div>
          <p className="eyebrow">
            {savedOnly ? "Pilihan tersimpan" : "Panduan Bandung Raya"}
          </p>
          <h1 className="editorial-title mt-3 text-4xl sm:text-6xl">
            {savedOnly
              ? "Rencanakan kunjungan Anda."
              : "Temukan tempat di Bandung."}
          </h1>
          <p className="mt-4 max-w-xl leading-7 text-ink/70">
            {savedOnly
              ? "Simpan tempat pilihan dan susun rencana kunjungan Anda. Pilihan tersimpan di browser ini."
              : "Jelajahi wisata alam, kuliner, kafe, dan tempat rekreasi di Bandung Raya."}
          </p>
        </div>
        <Link href="/activities" className="text-link">
          Cari aktivitas & tiket <ArrowUpRight size={18} />
        </Link>
      </div>
      <form onSubmit={search} className="catalog-search mt-8">
        <label>
          <span className="sr-only">Nama tempat atau kata kunci</span>
          <MagnifyingGlass size={21} />
          <input
            type="search"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Nama tempat, suasana, atau kawasan"
          />
        </label>
        <label>
          <span className="sr-only">Kawasan</span>
          <MapPin size={20} />
          <select
            value={area}
            onChange={(event) => setArea(event.target.value)}
          >
            <option value="">Semua kawasan</option>
            {(query.data?.areas ?? []).map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="primary-button">
          Cari tempat
        </button>
      </form>
      <div className="mt-6 flex flex-wrap gap-2" aria-label="Kategori tempat">
        {placeCategories.map((item) => (
          <button
            key={item.slug}
            type="button"
            className={`filter-chip ${category === item.slug ? "selected" : ""}`}
            aria-pressed={category === item.slug}
            onClick={() => update({ category: item.slug })}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
        <p role="status" className="text-sm text-ink/70">
          {query.isPending
            ? "Menyiapkan tempat pilihan…"
            : query.isError
              ? "Daftar tempat belum tersedia."
              : `${query.data?.total.toLocaleString("id-ID")} tempat${area ? ` di ${area}` : ""}`}
        </p>
        <label className="flex items-center gap-2 text-sm">
          <span>Urutkan</span>
          <select
            value={params.get("sort") ?? "recommended"}
            onChange={(event) => update({ sort: event.target.value })}
            className="min-h-11 rounded-lg border border-line bg-white px-3"
          >
            <option value="recommended">Foto & jumlah ulasan</option>
            <option value="name">Nama A–Z</option>
          </select>
        </label>
      </div>
      {query.isPending ? (
        <div
          className="mt-7 grid gap-7 sm:grid-cols-2 lg:grid-cols-3"
          aria-busy="true"
        >
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[4/3] rounded-2xl bg-line" />
              <div className="mt-4 h-5 w-2/3 rounded bg-line" />
            </div>
          ))}
        </div>
      ) : query.isError ? (
        <div className="empty-panel">
          <h2>Belum bisa memuat tempat.</h2>
          <p>Coba lagi dalam beberapa saat.</p>
          <button
            type="button"
            onClick={() => query.refetch()}
            className="primary-button"
          >
            Coba lagi
          </button>
        </div>
      ) : query.data?.places.length ? (
        <div className="mt-7 grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {query.data.places.map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}
        </div>
      ) : (
        <div className="empty-panel">
          <h2>
            {savedOnly
              ? "Daftar rencanamu masih kosong."
              : "Belum ada tempat yang cocok."}
          </h2>
          <p>
            {savedOnly
              ? "Tekan ikon hati pada tempat yang ingin kamu kunjungi."
              : "Coba kata kunci lain atau hapus filter kawasan."}
          </p>
          {savedOnly ? (
            <Link href="/explore" className="primary-button">
              Jelajahi tempat
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => router.push("/explore")}
              className="primary-button"
            >
              Hapus filter
            </button>
          )}
        </div>
      )}
      {pages > 1 && (
        <nav
          aria-label="Halaman hasil"
          className="mt-10 flex items-center justify-center gap-5"
        >
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => update({ page: String(page - 1) })}
            className="secondary-button"
          >
            <ArrowLeft size={18} />
            <span className="hidden sm:inline">Sebelumnya</span>
          </button>
          <span className="text-sm">
            {page} / {pages}
          </span>
          <button
            type="button"
            disabled={page >= pages}
            onClick={() => update({ page: String(page + 1) })}
            className="secondary-button"
          >
            <span className="hidden sm:inline">Berikutnya</span>
            <ArrowRight size={18} />
          </button>
        </nav>
      )}
      <p className="mt-10 border-t border-line pt-5 text-xs leading-6 text-ink/65">
        Referensi dari Google Maps, diperbarui 1 Oktober 2026. Informasi dapat
        berubah. Konfirmasi harga dan jam buka ke tempat tujuan. Tempat dalam
        katalog belum tentu mitra pemesanan Tripora.
      </p>
    </section>
  );
}

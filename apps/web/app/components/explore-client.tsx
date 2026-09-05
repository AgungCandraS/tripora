"use client";

import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Funnel, MagnifyingGlass, MapPin, SlidersHorizontal } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { ApiActivity, ApiCategory, ApiDestination } from "../lib/types";
import { ActivityCard } from "./activity-card";

interface SearchResponse {
  activities: ApiActivity[];
  total: number;
  page: number;
  pageSize: number;
}

function useDebounced(value: string, ms = 450) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function ExploreClient({
  initialQuery = "",
  initialCategory = "",
  initialArea = "",
  initialDate = "",
  initialGuests = "",
  title = "Temukan pengalaman yang terasa dekat.",
  description = "Cari aktivitas lokal Bandung Raya berdasarkan area, suasana, dan cara pergi yang kamu mau.",
}: {
  initialQuery?: string;
  initialCategory?: string;
  initialArea?: string;
  initialDate?: string;
  initialGuests?: string;
  title?: string;
  description?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [date, setDate] = useState(initialDate);
  const [guests, setGuests] = useState(initialGuests);
  const [category, setCategory] = useState(initialCategory);
  const [area, setArea] = useState(initialArea);
  const [showFilters, setShowFilters] = useState(false);
  const debouncedQ = useDebounced(query);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<ApiCategory[]>("/categories"),
  });
  const { data: destinations } = useQuery({
    queryKey: ["destinations"],
    queryFn: () => api.get<ApiDestination[]>("/destinations"),
  });

  const params = new URLSearchParams();
  if (debouncedQ.trim()) params.set("q", debouncedQ.trim());
  if (category) params.set("category", category);
  if (area) params.set("destination", area);

  const search = useQuery({
    queryKey: ["search", debouncedQ, category, area],
    queryFn: () => api.get<SearchResponse>(`/search?${params.toString()}`),
  });

  const results = search.data?.activities ?? [];
  const loading = search.isLoading;
  const failed = search.isError;

  function reset() {
    setQuery("");
    setCategory("");
    setArea("");
    setDate("");
    setGuests("");
  }

  return (
    <div className="mx-auto max-w-[1400px] px-5 pb-20 sm:px-8 lg:px-12">
      <div className="max-w-[720px] pt-14 sm:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-coral-dark">
            Explore Bandung Raya
          </p>
          <h1 className="display-text mt-3 text-3xl font-bold leading-[1.05] tracking-[-0.05em] sm:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-[560px] text-base leading-7 text-ink/60">{description}</p>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
        className="mt-10 grid gap-3 rounded-[16px] bg-ink p-3 text-paper shadow-[0_18px_50px_rgba(16,35,30,0.12)] lg:grid-cols-[1.4fr_0.65fr_auto]"
      >
        <label className="flex items-center gap-2 border-b border-paper/20 px-2 py-2 lg:border-b-0 lg:border-r lg:px-3">
          <MagnifyingGlass size={19} className="shrink-0 text-coral" />
          <span className="sr-only">Cari aktivitas</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari aktivitas, area, vendor…"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-paper/45"
          />
        </label>
        <label className="flex items-center gap-2 px-2 py-2 lg:px-3">
          <MapPin size={18} className="shrink-0 text-coral" />
          <span className="sr-only">Pilih area</span>
          <select
            value={area}
            onChange={(event) => setArea(event.target.value)}
            className="w-full bg-transparent text-sm text-paper outline-none [&>option]:text-ink"
          >
            <option className="text-ink" value="">Semua area</option>
            {(destinations ?? []).map((d) => (
              <option className="text-ink" key={d.slug} value={d.slug}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => setShowFilters((value) => !value)}
          aria-expanded={showFilters}
          className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-coral px-4 py-3 text-sm font-bold text-ink lg:min-w-32"
        >
          <SlidersHorizontal size={17} /> Filter
        </button>
      </motion.div>

      <AnimatePresence initial={false}>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden lg:hidden"
          >
            <CategoryPanel
              categories={categories ?? []}
              category={category}
              onPick={setCategory}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <div className="mt-5 hidden lg:block">
        <CategoryPanel categories={categories ?? []} category={category} onPick={setCategory} />
      </div>

      <div className="mt-10 flex items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          <p className="text-sm text-ink/55" role="status">
            {loading
              ? "Mencari…"
              : failed
                ? "Pencarian gagal dimuat."
                : `${search.data?.total ?? 0} pengalaman ditemukan`}
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-[-0.04em]">Pilihan untuk rencanamu</h2>
          {(date || guests) && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5" aria-label="Permintaan tanggal dan peserta">
              {date && <span className="rounded-full bg-ink px-3 py-1 text-xs font-bold text-paper">{date}</span>}
              {guests && <span className="rounded-full bg-ink px-3 py-1 text-xs font-bold text-paper">{guests}</span>}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={reset}
          className="hidden items-center gap-2 text-sm font-semibold text-ink/60 hover:text-ink sm:flex"
        >
          <SlidersHorizontal size={16} /> Reset
        </button>
      </div>

      {loading ? (
        <div className="mt-7 grid animate-pulse gap-5 md:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Memuat hasil">
          {[0, 1, 2].map((i) => (
            <div key={i} className="overflow-hidden rounded-[16px] border border-line">
              <div className="aspect-[1.12] bg-soft" />
              <div className="space-y-3 p-5">
                <div className="h-4 w-3/4 rounded-full bg-line" />
                <div className="h-4 w-1/2 rounded-full bg-soft" />
              </div>
            </div>
          ))}
        </div>
      ) : failed ? (
        <div className="mt-7 rounded-[16px] border border-line bg-paper px-6 py-14 text-center">
          <p className="text-lg font-bold">API tidak terjangkau.</p>
          <p className="mx-auto mt-2 max-w-[440px] text-sm leading-6 text-ink/55">
            Pastikan backend jalan (<code className="font-mono text-xs">npm run api</code>) dan
            env <code className="font-mono text-xs">NEXT_PUBLIC_API_URL</code> benar, lalu muat ulang.
          </p>
          <button
            type="button"
            onClick={() => search.refetch()}
            className="mt-5 rounded-[10px] bg-ink px-5 py-3 text-sm font-bold text-paper"
          >
            Coba lagi
          </button>
        </div>
      ) : results.length ? (
        <motion.div layout className="mt-7 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {results.map((activity, i) => (
              <motion.div
                key={activity.slug}
                layout
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.35 }}
              >
                <ActivityCard activity={activity} index={i} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <div className="mt-7 rounded-[16px] border border-dashed border-line bg-paper px-6 py-14 text-center">
          <p className="text-lg font-bold">Tidak ada hasil yang cocok.</p>
          <p className="mx-auto mt-2 max-w-[420px] text-sm leading-6 text-ink/55">
            Coba kata kunci lain seperti “rafting”, “Lembang”, atau reset filter.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-5 rounded-[10px] bg-ink px-5 py-3 text-sm font-bold text-paper"
          >
            Reset pencarian
          </button>
        </div>
      )}
    </div>
  );
}

function CategoryPanel({
  categories,
  category,
  onPick,
}: {
  categories: ApiCategory[];
  category: string;
  onPick: (slug: string) => void;
}) {
  return (
    <div className="mt-5 rounded-[12px] border border-line bg-paper p-4 sm:p-5">
      <div className="flex items-center gap-2 text-sm font-bold">
        <Funnel size={17} className="text-coral-dark" /> Kategori pengalaman
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => onPick("")}
          type="button"
          aria-pressed={category === ""}
          className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
            category === "" ? "border-ink bg-ink text-paper" : "border-line text-ink/65 hover:border-ink/40"
          }`}
        >
          Semua
        </button>
        {categories.map((item) => (
          <button
            key={item.slug}
            onClick={() => onPick(category === item.slug ? "" : item.slug)}
            type="button"
            aria-pressed={category === item.slug}
            className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
              category === item.slug ? "border-ink bg-ink text-paper" : "border-line text-ink/65 hover:border-ink/40"
            }`}
          >
            {item.name}
          </button>
        ))}
      </div>
    </div>
  );
}

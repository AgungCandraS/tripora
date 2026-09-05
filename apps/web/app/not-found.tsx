import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Tidak ditemukan | Tripora" };

export default function NotFound() {
  return (
    <main className="mx-auto max-w-[620px] px-5 py-24 text-center sm:px-8">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-coral-dark">404</p>
      <h1 className="display-text mt-3 text-4xl font-bold tracking-[-0.045em] sm:text-5xl">
        Rute ini tidak ada di peta.
      </h1>
      <p className="mx-auto mt-4 max-w-[440px] text-sm leading-6 text-ink/60">
        Destinasi atau aktivitas yang kamu cari mungkin dipindah atau belum dikurasi.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link
          href="/explore"
          className="rounded-[10px] bg-coral px-5 py-3 text-sm font-bold text-ink hover:bg-[#ed8c6b]"
        >
          Explore aktivitas
        </Link>
        <Link
          href="/destinations"
          className="rounded-[10px] border border-line px-5 py-3 text-sm font-bold hover:border-ink/40"
        >
          Lihat destinasi
        </Link>
      </div>
    </main>
  );
}

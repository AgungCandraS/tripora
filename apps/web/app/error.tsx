"use client";

import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-[620px] px-5 py-24 text-center sm:px-8">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-coral-dark">
        Ada kendala
      </p>
      <h1 className="display-text mt-3 text-4xl font-bold tracking-[-0.045em]">
        Halaman gagal dimuat.
      </h1>
      <p className="mx-auto mt-4 max-w-[440px] text-sm leading-6 text-ink/60">
        {error.message || "Terjadi kesalahan tak terduga. Coba muat ulang halaman."}
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-[10px] bg-ink px-5 py-3 text-sm font-bold text-paper"
        >
          Coba lagi
        </button>
        <Link
          href="/"
          className="rounded-[10px] border border-line px-5 py-3 text-sm font-bold hover:border-ink/40"
        >
          Ke beranda
        </Link>
      </div>
    </main>
  );
}

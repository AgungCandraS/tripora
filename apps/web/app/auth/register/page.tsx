"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { z } from "zod";
import { useAuth } from "../../components/providers";
import { SiteFooter, SiteHeader } from "../../components/site-header";
import { Field, inputClass } from "../../components/form";
import { ApiError } from "../../lib/api";

const schema = z.object({
  full_name: z.string().min(3, "Nama minimal 3 karakter"),
  email: z.string().email("Email tidak valid"),
  phone: z.string().regex(/^08[0-9]{8,12}$/, "WhatsApp diawali 08"),
  password: z.string().min(8, "Password min. 8 karakter"),
});

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[100dvh] items-center justify-center bg-paper px-5 text-ink">
          <p className="text-sm font-semibold text-ink/55" role="status">Memuat…</p>
        </main>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
  const loginHref = safeNext ? `/auth/login?next=${encodeURIComponent(safeNext)}` : "/auth/login";
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Input tidak valid");
      return;
    }
    setError("");
    setBusy(true);
    try {
      await register({ ...parsed.data, email: parsed.data.email.trim() });
      // Akun wajib verifikasi email sebelum bisa masuk (PRD §7.1).
      const params = new URLSearchParams({ email: parsed.data.email.trim() });
      if (safeNext) params.set("next", safeNext);
      router.push(`/auth/verify?${params.toString()}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal daftar. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="bg-paper text-ink">
      <SiteHeader />
      <section className="mx-auto max-w-[480px] px-5 pb-24 pt-14 sm:pt-20">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-coral-dark">
          Customer account
        </p>
        <h1 className="display-text mt-2 text-3xl font-bold tracking-[-0.045em] sm:text-4xl">
          Mulai simpan trip-mu.
        </h1>
        <p className="mt-3 text-sm leading-6 text-ink/60">
          Satu akun untuk histori booking, wishlist, dan review terverifikasi.
        </p>
        <form onSubmit={submit} className="mt-8 space-y-5 rounded-[16px] border border-line bg-paper p-6 sm:p-8">
          {error && <p className="rounded-[10px] bg-[#f6d9c8] px-4 py-3 text-sm font-semibold text-[#8a3a20]" role="alert">{error}</p>}
          <Field label="Nama lengkap">
            <input required value={form.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="Nama sesuai identitas" autoComplete="name" className={inputClass} />
          </Field>
          <Field label="Email">
            <input type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="kamu@email.com" autoComplete="email" className={inputClass} />
          </Field>
          <Field label="WhatsApp">
            <input type="tel" required value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="08xxxxxxxxxx" autoComplete="tel" className={inputClass} />
          </Field>
          <Field label="Password">
            <div className="relative mt-2">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                placeholder="Min. 8 karakter"
                autoComplete="new-password"
                className={`${inputClass} mt-0 pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-[10px] text-sm font-bold text-ink/45 transition hover:text-ink"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </Field>
          <button type="submit" disabled={busy} className="w-full rounded-[10px] bg-coral px-5 py-3.5 text-sm font-bold text-ink transition hover:bg-[#ed8c6b] disabled:opacity-60">
            {busy ? "Mendaftar…" : "Buat akun"}
          </button>
          <p className="text-center text-sm text-ink/55">
            Sudah punya akun?{" "}
            <Link href={loginHref} className="font-bold text-coral-dark underline underline-offset-4">
              Masuk
            </Link>
          </p>
        </form>
      </section>
      <SiteFooter />
    </main>
  );
}

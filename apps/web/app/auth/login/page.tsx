"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { z } from "zod";
import { useAuth } from "../../components/providers";
import { SiteFooter, SiteHeader } from "../../components/site-header";
import { Field, inputClass } from "../../components/form";
import { ApiError } from "../../lib/api";

const schema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

function roleHome(roles: string[]): string {
  if (roles.includes("ADMIN")) return "/admin";
  if (roles.includes("VENDOR_OWNER")) return "/vendor";
  if (roles.includes("VENDOR_STAFF")) return "/staff";
  return "/account";
}

function codesOf(user: { roles?: Array<string | { role?: { code?: string }; code?: string }> }): string[] {
  return (user.roles ?? [])
    .map((r) => (typeof r === "string" ? r : (r?.role?.code ?? r?.code ?? "")))
    .filter((c) => c.length > 0);
}

function LoginForm() {
  const { login, user, roles, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  // next hanya untuk path lokal (anti open-redirect).
  const next = searchParams.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
  const home = (codes: string[]) => safeNext ?? roleHome(codes);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Redirect yang sudah login — di effect, bukan saat render (hindari setState-in-render pada Router).
  useEffect(() => {
    if (!loading && user) {
      router.replace(home(roles));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, roles, router]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Input tidak valid");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const u = await login(email.trim(), password);
      router.push(home(codesOf(u)));
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "";
      if (code === "EMAIL_NOT_VERIFIED") {
        router.push(`/auth/verify?email=${encodeURIComponent(email.trim())}`);
        return;
      }
      setError(err instanceof ApiError ? err.message : "Gagal masuk. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  if (!loading && user) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-paper px-5 text-ink">
        <p className="text-sm font-semibold text-ink/55" role="status">Mengalihkan ke dashboard…</p>
      </main>
    );
  }

  return (
    <main className="bg-paper text-ink">
      <SiteHeader />
      <section className="mx-auto max-w-[480px] px-5 pb-24 pt-14 sm:pt-20">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-coral-dark">
          Customer account
        </p>
        <h1 className="display-text mt-2 text-3xl font-bold tracking-[-0.045em] sm:text-4xl">
          Selamat datang kembali.
        </h1>
        <p className="mt-3 text-sm leading-6 text-ink/60">
          Booking sebagai guest tetap bisa dilacak via My Trips. Masuk untuk histori
          penuh sesuai rolemu.
        </p>
        <form onSubmit={submit} className="mt-8 space-y-5 rounded-[16px] border border-line bg-paper p-6 sm:p-8">
          {error && <p className="rounded-[10px] bg-[#f6d9c8] px-4 py-3 text-sm font-semibold text-[#8a3a20]" role="alert">{error}</p>}
          <Field label="Email">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="kamu@email.com" autoComplete="email" className={inputClass} />
          </Field>
          <Field label="Password">
            <div className="relative mt-2">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
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
          <button type="submit" disabled={busy} className="w-full rounded-[10px] bg-ink px-5 py-3.5 text-sm font-bold text-paper transition hover:bg-moss disabled:opacity-60">
            {busy ? "Memeriksa…" : "Masuk"}
          </button>
          <p className="text-center text-sm text-ink/55">
            Belum punya akun?{" "}
            <Link href={safeNext ? `/auth/register?next=${encodeURIComponent(safeNext)}` : "/auth/register"} className="font-bold text-coral-dark underline underline-offset-4">
              Daftar
            </Link>
          </p>
        </form>
        <p className="mt-4 text-center text-xs leading-5 text-ink/45">
          Booking sebagai guest tetap bisa dilacak via <Link href="/my-trips" className="font-bold text-coral-dark underline underline-offset-4">My Trips</Link> tanpa login.
        </p>
      </section>
      <SiteFooter />
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[100dvh] items-center justify-center bg-paper px-5 text-ink">
          <p className="text-sm font-semibold text-ink/55" role="status">Memuat…</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

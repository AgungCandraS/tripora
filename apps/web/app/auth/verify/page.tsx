"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { Check } from "@phosphor-icons/react";
import { SiteFooter, SiteHeader } from "../../components/site-header";
import { ApiError, api } from "../../lib/api";

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const emailParam = searchParams.get("email") ?? "";
  const next = searchParams.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;

  const [state, setState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(emailParam);
  const [resent, setResent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    setState("working");
    api
      .post("/auth/verify-email", { token }, null)
      .then(() => {
        if (alive) {
          setState("done");
          window.setTimeout(() => router.push(safeNext ?? "/auth/login"), 2500);
        }
      })
      .catch((e) => {
        if (!alive) return;
        setState("error");
        setMessage(e instanceof ApiError ? e.message : "Verifikasi gagal.");
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function resend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setResent(false);
    setMessage("");
    try {
      await api.post("/auth/resend-verification", { email: email.trim() }, null);
      setResent(true);
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Gagal mengirim ulang.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-[480px] px-5 pb-24 pt-14 text-center sm:pt-20">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-coral-dark">Verifikasi email</p>
      {state === "working" && (
        <>
          <h1 className="display-text mt-2 text-3xl font-bold tracking-[-0.045em]">Memverifikasi…</h1>
          <p className="mt-3 text-sm text-ink/60">Tunggu sebentar.</p>
        </>
      )}
      {state === "done" && (
        <>
          <span className="mx-auto mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-sage text-moss">
            <Check size={28} weight="bold" />
          </span>
          <h1 className="display-text mt-4 text-3xl font-bold tracking-[-0.045em]">Email terverifikasi.</h1>
          <p className="mt-3 text-sm text-ink/60">Mengalihkan ke halaman masuk…</p>
        </>
      )}
      {state === "error" && (
        <>
          <h1 className="display-text mt-2 text-3xl font-bold tracking-[-0.045em]">Link tidak berlaku.</h1>
          <p className="mt-3 text-sm text-ink/60" role="alert">{message} Minta link baru di bawah.</p>
        </>
      )}
      {state !== "working" && (
        <form onSubmit={resend} className="mt-8 space-y-4 rounded-[16px] border border-line bg-paper p-6 text-left sm:p-8">
          <h2 className="font-bold">{token ? "Kirim ulang link" : "Cek email kamu"}</h2>
          <p className="text-sm leading-6 text-ink/60">
            {emailParam
              ? <>Link verifikasi dikirim ke <strong>{emailParam}</strong> (kedaluwarsa 24 jam). Belum masuk? kirim ulang:</>
              : "Masukkan email pendaftaran untuk mengirim ulang link verifikasi."}
          </p>
          {message && state !== "error" && <p className="text-xs font-bold text-coral-dark" role="alert">{message}</p>}
          {resent && <p className="text-xs font-bold text-moss" role="status">Terkirim. Cek inbox/spam.</p>}
          <label className="block">
            <span className="text-sm font-semibold">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kamu@email.com"
              autoComplete="email"
              className="mt-2 w-full rounded-[10px] border border-line bg-transparent px-3.5 py-3 text-sm outline-none focus:border-coral-dark"
            />
          </label>
          <button type="submit" disabled={busy} className="w-full rounded-[10px] bg-ink px-5 py-3.5 text-sm font-bold text-paper disabled:opacity-60">
            {busy ? "Mengirim…" : "Kirim ulang link"}
          </button>
          <p className="text-center text-sm text-ink/55">
            <Link href={safeNext ? `/auth/login?next=${encodeURIComponent(safeNext)}` : "/auth/login"} className="font-bold text-coral-dark underline underline-offset-4">
              Kembali masuk
            </Link>
          </p>
        </form>
      )}
    </section>
  );
}

export default function VerifyPage() {
  return (
    <main className="bg-paper text-ink">
      <SiteHeader />
      <Suspense
        fallback={
          <section className="mx-auto max-w-[480px] px-5 pb-24 pt-14 text-center">
            <p className="text-sm text-ink/60" role="status">Memuat…</p>
          </section>
        }
      >
        <VerifyForm />
      </Suspense>
      <SiteFooter />
    </main>
  );
}

"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { StatusPill } from "../../components/workspace-shell";
import { useAuth } from "../../components/providers";
import { SiteFooter, SiteHeader } from "../../components/site-header";
import { API_URL, ApiError, api } from "../../lib/api";
import { Field, inputClass } from "../../components/form";

const STEPS = ["Bisnis", "Operasional", "Bank & dokumen", "Review"];

const CLUSTERS = ["Bandung City", "Lembang", "Ciwidey", "Pangalengan", "Dago", "Bandung Barat"];

async function uploadDoc(file: File, token: string | null): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_URL}/api/v1/uploads`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const json = (await res.json().catch(() => null)) as {
    success?: boolean;
    data?: { object_key?: string };
    error?: { code?: string; message?: string | string[] };
  } | null;
  if (!res.ok || !json || json.success === false || !json.data?.object_key) {
    const err = json?.error;
    const message = Array.isArray(err?.message) ? err.message.join("; ") : (err?.message ?? "Upload gagal.");
    throw new ApiError(err?.code ?? "UPLOAD_FAILED", message, res.status);
  }
  return json.data.object_key;
}

export default function VendorOnboardingPage() {
  const { user, token, logout } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [createdSlug, setCreatedSlug] = useState("");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [phone, setPhone] = useState("");
  const [bankName, setBankName] = useState("BCA");
  const [bankNumber, setBankNumber] = useState("");
  const [bankOwner, setBankOwner] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!user) {
      router.push("/auth/register?next=/vendor/onboarding");
      return;
    }
    if (!name.trim()) {
      setError("Nama bisnis wajib diisi.");
      setStep(0);
      return;
    }
    setError("");
    setBusy(true);
    try {
      const vendor = await api.post<{ slug: string; id: string }>(
        "/vendors",
        {
          name: name.trim(),
          description: desc.trim() || undefined,
          phone: phone.trim() || undefined,
          email: user.email ?? undefined,
          bank_name: bankName || undefined,
          bank_account_number: bankNumber.trim() || undefined,
          bank_account_name: bankOwner.trim() || undefined,
        },
        token
      );
      if (docFile) {
        const objectKey = await uploadDoc(docFile, token);
        await api.post("/vendor/documents", { type: "LEGALITAS", object_key: objectKey }, token);
      }
      setCreatedSlug(vendor.slug);
      setDone(true);
      window.scrollTo({ top: 0 });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Gagal mengirim pengajuan.");
    } finally {
      setBusy(false);
    }
  }

  function relogin() {
    logout();
    router.push("/auth/login?next=/vendor");
  }

  const shell = (children: React.ReactNode) => (
    <main className="bg-paper text-ink">
      <SiteHeader />
      <section className="mx-auto max-w-[720px] px-5 pb-24 pt-14 sm:pt-20">{children}</section>
      <SiteFooter />
    </main>
  );

  if (done)
    return shell(
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-auto max-w-[560px] py-10 text-center"
      >
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sage text-moss">
          <Check size={28} weight="bold" />
        </span>
        <h1 className="mt-6 text-3xl font-bold tracking-[-0.04em]">Pengajuan terkirim.</h1>
        <p className="mx-auto mt-3 max-w-[420px] text-sm leading-6 text-ink/60">
          <strong className="text-ink">{name || "Bisnis"}</strong> masuk antrean verifikasi
          admin dengan status PENDING{createdSlug ? ` (${createdSlug})` : ""}. Role
          VENDOR_OWNER sudah dipasang — <strong className="text-ink">keluar lalu masuk lagi</strong> agar
          workspace vendor terbuka.
        </p>
        <div className="mt-5 inline-flex">
          <StatusPill status="PENDING_PAYMENT" />
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={relogin}
            className="rounded-[10px] bg-ink px-5 py-3.5 text-sm font-bold text-paper"
          >
            Keluar & masuk lagi
          </button>
          <Link href="/" className="rounded-[10px] border border-line px-5 py-3.5 text-sm font-bold hover:border-ink/40">
            Ke beranda
          </Link>
        </div>
      </motion.div>
    );

  return shell(
    <>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-coral-dark">
        Vendor onboarding
      </p>
      <h1 className="display-text mt-2 text-3xl font-bold tracking-[-0.045em] sm:text-4xl">
        Daftarkan bisnismu.
      </h1>
      <p className="mt-3 max-w-[560px] text-sm leading-6 text-ink/60">
        Register → submit info bisnis → verifikasi admin → approved. Tanpa login kamu tetap bisa
        mengisi — akun diminta saat mengirim. Alur sesuai PRD §16.
      </p>
      {!user && (
        <p className="mt-4 rounded-[12px] border border-dashed border-line bg-paper px-4 py-3 text-sm text-ink/60">
          Belum masuk? <Link href="/auth/register?next=/vendor/onboarding" className="font-bold text-coral-dark underline underline-offset-4">Daftar dulu</Link> atau{" "}
          <Link href="/auth/login?next=/vendor/onboarding" className="font-bold text-coral-dark underline underline-offset-4">masuk</Link> sebelum kirim pengajuan.
        </p>
      )}
      <ol className="mt-8 grid grid-cols-4 gap-2" aria-label="Langkah onboarding">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-col gap-2">
            <span className={`h-1.5 rounded-full ${i <= step ? "bg-coral" : "bg-line"}`} aria-hidden="true" />
            <span className={`text-[11px] font-bold sm:text-xs ${i <= step ? "text-ink" : "text-ink/40"}`}>
              {i + 1}. {s}
            </span>
          </li>
        ))}
      </ol>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 rounded-[16px] border border-line bg-paper p-6 sm:p-8"
        >
          {step === 0 && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Nama bisnis" span>
                <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="cth. Palayangan River Club" className={inputClass} />
              </Field>
              <Field label="Area utama">
                <select className={inputClass} defaultValue="Pangalengan">
                  {CLUSTERS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="WhatsApp operasional">
                <input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" className={inputClass} />
              </Field>
              <Field label="Deskripsi singkat" span>
                <textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ceritakan pengalaman yang kamu operasikan…" className={`${inputClass} resize-none`} />
              </Field>
            </div>
          )}
          {step === 1 && (
            <div className="grid gap-5">
              <Field label="Kategori aktivitas">
                <div className="mt-2 flex flex-wrap gap-2">
                  {["ATV", "Rafting", "Camping", "Trekking", "Family", "Tour", "Kuliner", "Workshop"].map((c) => (
                    <label key={c} className="cursor-pointer rounded-full border border-line px-3.5 py-2 text-sm font-semibold has-checked:border-ink has-checked:bg-ink has-checked:text-paper">
                      <input type="checkbox" className="sr-only" defaultChecked={c === "Rafting"} /> {c}
                    </label>
                  ))}
                </div>
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Meeting point">
                  <input placeholder="cth. Basecamp Palayangan" className={inputClass} />
                </Field>
                <Field label="Minimum usia">
                  <input type="number" min={5} defaultValue={10} className={inputClass} />
                </Field>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Bank">
                <select value={bankName} onChange={(e) => setBankName(e.target.value)} className={inputClass}>
                  {["BCA", "Mandiri", "BRI", "BNI"].map((b) => <option key={b}>{b}</option>)}
                </select>
              </Field>
              <Field label="Nomor rekening">
                <input required inputMode="numeric" value={bankNumber} onChange={(e) => setBankNumber(e.target.value)} placeholder="cth. 1234567890" className={`${inputClass} font-mono`} />
              </Field>
              <Field label="Nama pemilik rekening" span>
                <input required value={bankOwner} onChange={(e) => setBankOwner(e.target.value)} placeholder="Sesuai buku tabungan" className={inputClass} />
              </Field>
              <Field label="Dokumen legalitas (KTP/NIB, JPG/PNG/PDF ≤5MB)" span>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
                  className="mt-2 w-full text-sm file:mr-3 file:rounded-[8px] file:border file:border-line file:bg-soft file:px-4 file:py-2.5 file:text-sm file:font-bold hover:file:border-ink/40"
                />
                <span className="mt-1.5 block text-xs text-ink/45">
                  {docFile ? `Terpilih: ${docFile.name}` : "Diunggah ke storage saat pengajuan dikirim."}
                </span>
              </Field>
            </div>
          )}
          {step === 3 && (
            <div className="text-sm leading-6 text-ink/65">
              <h2 className="text-lg font-bold text-ink">Periksa sebelum kirim</h2>
              <dl className="mt-4 space-y-2.5">
                {[
                  ["Bisnis", name || "—"],
                  ["WhatsApp", phone || "—"],
                  ["Rekening", bankNumber ? `${bankName} · ${bankNumber}` : "—"],
                  ["Dokumen", docFile ? docFile.name : "—"],
                  ["Status", "Menunggu verifikasi"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 border-b border-line pb-2.5">
                    <dt className="text-ink/50">{k}</dt>
                    <dd className="font-semibold text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-xs leading-5 text-ink/45">
                Dengan mengirim, kamu menyetujui komisi platform tercatat sebagai snapshot
                per transaksi dan payout mengikuti jadwal settlement.
              </p>
            </div>
          )}

          <div className="mt-7 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={step === 0}
              onClick={() => setStep((s) => s - 1)}
              className="inline-flex items-center gap-2 rounded-[10px] border border-line px-4 py-3 text-sm font-bold disabled:opacity-40"
            >
              <ArrowLeft size={16} /> Kembali
            </button>
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="inline-flex items-center gap-2 rounded-[10px] bg-ink px-5 py-3 text-sm font-bold text-paper"
              >
                Lanjut <ArrowRight size={16} weight="bold" />
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-[10px] bg-coral px-5 py-3 text-sm font-bold text-ink hover:bg-[#ed8c6b] disabled:opacity-60"
              >
                <Check size={17} weight="bold" /> {busy ? "Mengirim…" : user ? "Kirim pengajuan" : "Daftar & kirim"}
              </button>
            )}
          </div>
          {error && (
            <p className="mt-4 rounded-[10px] bg-[#f6d9c8] px-4 py-3 text-sm font-semibold text-[#8a3a20]" role="alert">
              {error}
            </p>
          )}
        </motion.div>
      </AnimatePresence>
    </>
  );
}

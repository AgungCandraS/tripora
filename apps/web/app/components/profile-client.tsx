"use client";

import { FormEvent, useState } from "react";
import { useAuth } from "./providers";
import { ApiError, api } from "../lib/api";

/**
 * Profil akun (identitas + keamanan) — dipakai semua role, terpisah dari Settings operasional.
 * Backend: GET/PATCH /me/profile, POST /auth/change-password.
 */
export function ProfileClient() {
  const { user, token } = useAuth();
  const [name, setName] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwDone, setPwDone] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    setProfileError("");
    try {
      await api.patch(
        "/me/profile",
        { ...(name !== null ? { full_name: name } : {}), ...(phone !== null ? { phone } : {}) },
        token
      );
      setSaved(true);
    } catch (err) {
      setProfileError(err instanceof ApiError ? err.message : "Gagal menyimpan profil.");
    }
  }

  async function changePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPwDone(false);
    setPwError("");
    if (newPw.length < 8) {
      setPwError("Password baru minimal 8 karakter.");
      return;
    }
    setPwBusy(true);
    try {
      await api.post("/auth/change-password", { currentPassword: currentPw, newPassword: newPw }, token);
      setPwDone(true);
      setCurrentPw("");
      setNewPw("");
    } catch (err) {
      setPwError(err instanceof ApiError ? err.message : "Gagal mengganti password.");
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <div className="mt-7 grid gap-5 lg:grid-cols-2">
      <section className="h-fit rounded-[14px] border border-line bg-paper p-5 sm:p-6">
        <h2 className="text-lg font-bold tracking-[-0.02em]">Identitas akun</h2>
        <p className="mt-1 text-sm text-ink/55">Data ini dipakai untuk booking, e-ticket, dan notifikasi.</p>
        <form onSubmit={saveProfile} className="mt-5 space-y-4">
          {profileError && <p className="rounded-[10px] bg-[#f6d9c8] px-4 py-2.5 text-xs font-bold text-[#8a3a20]" role="alert">{profileError}</p>}
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-ink/45">Nama lengkap</span>
            <input
              defaultValue={user?.full_name ?? ""}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className="mt-2 w-full rounded-[10px] border border-line bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-coral-dark"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-ink/45">WhatsApp</span>
            <input
              defaultValue={user?.phone ?? ""}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08…"
              autoComplete="tel"
              className="mt-2 w-full rounded-[10px] border border-line bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-coral-dark"
            />
          </label>
          <p className="font-mono text-xs text-ink/45">{user?.email ?? ""}</p>
          <div className="flex items-center gap-3">
            <button type="submit" className="rounded-[10px] bg-ink px-4 py-2.5 text-sm font-bold text-paper">
              Simpan profil
            </button>
            {saved && <span className="text-xs font-bold text-moss" role="status">Tersimpan.</span>}
          </div>
        </form>
      </section>

      <section className="h-fit rounded-[14px] border border-line bg-paper p-5 sm:p-6">
        <h2 className="text-lg font-bold tracking-[-0.02em]">Keamanan</h2>
        <p className="mt-1 text-sm text-ink/55">Ganti password mengeluarkan semua sesi lain.</p>
        <form onSubmit={changePassword} className="mt-5 space-y-4">
          {pwError && <p className="rounded-[10px] bg-[#f6d9c8] px-4 py-2.5 text-xs font-bold text-[#8a3a20]" role="alert">{pwError}</p>}
          {pwDone && <p className="rounded-[10px] bg-sage px-4 py-2.5 text-xs font-bold text-moss" role="status">Password diganti.</p>}
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-ink/45">Password saat ini</span>
            <input
              type={showPw ? "text" : "password"}
              required
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              autoComplete="current-password"
              className="mt-2 w-full rounded-[10px] border border-line bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-coral-dark"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-ink/45">Password baru (min. 8)</span>
            <div className="relative mt-2">
              <input
                type={showPw ? "text" : "password"}
                required
                minLength={8}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-[10px] border border-line bg-transparent px-3.5 py-2.5 pr-12 text-sm outline-none focus:border-coral-dark"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "Sembunyikan password" : "Tampilkan password"}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-sm font-bold text-ink/45 hover:text-ink"
              >
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
          </label>
          <button type="submit" disabled={pwBusy} className="rounded-[10px] bg-coral px-4 py-2.5 text-sm font-bold text-ink transition hover:bg-[#ed8c6b] disabled:opacity-60">
            {pwBusy ? "Menyimpan…" : "Ganti password"}
          </button>
        </form>
      </section>
    </div>
  );
}

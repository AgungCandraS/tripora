"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus } from "@phosphor-icons/react";
import { FormEvent, useState } from "react";
import { StatusPill, WorkspaceHeader, WorkspaceShell } from "../../components/workspace-shell";
import { useAuth } from "../../components/providers";
import { ApiError, api } from "../../lib/api";

interface StaffRow {
  id: string;
  role_name: string;
  status: string;
  user: { id: string; full_name: string; email: string };
}

export default function VendorStaffPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [roleName, setRoleName] = useState("VENDOR_STAFF");
  const [error, setError] = useState("");

  const query = useQuery({
    queryKey: ["vendor-staff"],
    queryFn: () => api.get<{ staff: StaffRow[] }>("/vendor/staff", token),
    enabled: Boolean(token),
  });
  const rows = query.data?.staff ?? [];
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["vendor-staff"] });

  async function invite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim()) return;
    setError("");
    try {
      await api.post("/vendor/staff", { email: email.trim(), role_name: roleName }, token);
      setEmail("");
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal mengundang. Pastikan email sudah terdaftar.");
    }
  }

  async function toggle(m: StaffRow) {
    try {
      await api.patch(`/vendor/staff/${m.id}`, { status: m.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" }, token);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal mengubah status.");
    }
  }

  return (
    <WorkspaceShell role="vendor" current="/vendor/staff">
      <WorkspaceHeader
        eyebrow="Team"
        title="Staff & permission."
        description="Undang akun terdaftar via email. Staff mendapat permission operasional — revenue dan payout tetap owner." />
      <form onSubmit={invite} className="mt-8 grid max-w-[560px] gap-2 sm:grid-cols-[1fr_0.7fr_auto]">
        <input
          type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="Email staff (sudah daftar)…"
          className="min-w-0 rounded-[10px] border border-line bg-paper px-3.5 py-3 text-sm outline-none placeholder:text-ink/35 focus:border-coral-dark"
       />
        <select value={roleName} onChange={(e) => setRoleName(e.target.value)} className="rounded-[10px] border border-line bg-paper px-3 py-3 text-sm font-bold outline-none focus:border-coral-dark" aria-label="Role">
          <option value="VENDOR_STAFF">Staff lapangan</option>
        </select>
        <button type="submit" className="inline-flex items-center justify-center gap-1.5 rounded-[10px] bg-ink px-4 py-3 text-sm font-bold text-paper">
          <UserPlus size={16} /> Undang
        </button>
      </form>
      {error && <p className="mt-3 text-xs font-bold text-coral-dark" role="alert">{error}</p>}
      <div className="mt-5 max-w-[720px] space-y-3">
        {query.isLoading ? (
          <div className="h-20 animate-pulse rounded-[12px] bg-paper" aria-busy="true" aria-label="Memuat staff" />
        ) : rows.length === 0 ? (
          <p className="rounded-[12px] border border-dashed border-line bg-paper px-5 py-10 text-center text-sm text-ink/55">
            Belum ada staff. Undang lewat email di atas.
          </p>
        ) : (
          rows.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-line bg-paper px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-soft text-sm font-black text-moss">
                  {s.user.full_name.charAt(0).toUpperCase()}
                </span>
                <div>
                  <p className="text-sm font-bold">{s.user.full_name}</p>
                  <p className="mt-0.5 font-mono text-xs text-ink/50">{s.user.email} · {s.role_name.replace("_", " ")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill status={s.status === "ACTIVE" ? "PAID" : "CANCELLED"} />
                <button type="button" onClick={() => toggle(s)} className="rounded-[8px] border border-line px-3 py-2 text-xs font-bold hover:border-ink/40">
                  {s.status === "ACTIVE" ? "Suspend" : "Aktifkan"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </WorkspaceShell>
  );
}

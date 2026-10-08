"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import {
  WorkspaceHeader,
  WorkspaceShell,
} from "../../components/workspace-shell";
import { useAuth } from "../../components/providers";
import { ApiError, api, formatIDR } from "../../lib/api";

interface VendorProfile {
  id: string;
  name: string;
  slug: string;
  status: string;
  commission_rate_default: number | string;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
}

export default function VendorSettingsPage() {
  const { authenticated, token } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    bank_name: "",
    bank_account_number: "",
    bank_account_name: "",
  });
  const [touched, setTouched] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const query = useQuery({
    queryKey: ["vendor-profile"],
    queryFn: () => api.get<VendorProfile>("/vendor/profile", token),
    enabled: Boolean(authenticated),
  });
  const vendor = query.data ?? null;
  const commission = vendor ? Number(vendor.commission_rate_default) * 100 : 0;

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    setError("");
    try {
      await api.patch(
        "/vendor/profile",
        {
          ...(form.bank_name ? { bank_name: form.bank_name } : {}),
          ...(form.bank_account_number
            ? { bank_account_number: form.bank_account_number }
            : {}),
          ...(form.bank_account_name
            ? { bank_account_name: form.bank_account_name }
            : {}),
        },
        token,
      );
      setSaved(true);
      setTouched(false);
      await queryClient.invalidateQueries({ queryKey: ["vendor-profile"] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan.");
    }
  }

  return (
    <WorkspaceShell role="vendor" current="/vendor/settings">
      <WorkspaceHeader
        eyebrow="Settings"
        title="Pengaturan operasional."
        description="Rekening payout dan info komisi. Ini pengaturan bisnis — beda dengan Profil akun pribadimu."
      />
      <div className="mt-7 grid gap-5 lg:grid-cols-2">
        <section className="h-fit rounded-[14px] border border-line bg-paper p-5 sm:p-6">
          <h2 className="text-lg font-bold">Rekening payout</h2>
          <p className="mt-1 text-sm text-ink/55">
            Dana payout dikirim ke rekening ini setelah diproses admin.
          </p>
          <form onSubmit={save} className="mt-5 space-y-4">
            {error && (
              <p
                className="rounded-[10px] bg-[#f6d9c8] px-4 py-2.5 text-xs font-bold text-[#8a3a20]"
                role="alert"
              >
                {error}
              </p>
            )}
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.1em] text-ink/45">
                Bank
              </span>
              <input
                defaultValue={vendor?.bank_name ?? ""}
                placeholder="cth. BCA"
                onChange={(e) => {
                  setForm((f) => ({ ...f, bank_name: e.target.value }));
                  setTouched(true);
                }}
                className="mt-2 w-full rounded-[10px] border border-line bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-coral-dark"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.1em] text-ink/45">
                Nomor rekening
              </span>
              <input
                defaultValue={vendor?.bank_account_number ?? ""}
                placeholder="cth. 1234567890"
                inputMode="numeric"
                onChange={(e) => {
                  setForm((f) => ({
                    ...f,
                    bank_account_number: e.target.value,
                  }));
                  setTouched(true);
                }}
                className="mt-2 w-full rounded-[10px] border border-line bg-transparent px-3.5 py-2.5 font-mono text-sm outline-none focus:border-coral-dark"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.1em] text-ink/45">
                Nama pemilik rekening
              </span>
              <input
                defaultValue={vendor?.bank_account_name ?? ""}
                placeholder="Sesuai buku tabungan"
                onChange={(e) => {
                  setForm((f) => ({ ...f, bank_account_name: e.target.value }));
                  setTouched(true);
                }}
                className="mt-2 w-full rounded-[10px] border border-line bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-coral-dark"
              />
            </label>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={!touched}
                className="rounded-[10px] bg-ink px-4 py-2.5 text-sm font-bold text-paper disabled:opacity-50"
              >
                Simpan rekening
              </button>
              {saved && (
                <span className="text-xs font-bold text-moss" role="status">
                  Tersimpan.
                </span>
              )}
            </div>
          </form>
        </section>

        <section className="h-fit space-y-5">
          <div className="rounded-[14px] bg-ink p-5 text-paper sm:p-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-coral">
              Komisi platform
            </p>
            <p className="mt-2 text-3xl font-bold">
              {query.isLoading ? "…" : `${commission.toFixed(1)}%`}
            </p>
            <p className="mt-2 text-xs leading-5 text-paper/60">
              Ditetapkan admin per vendor dan di-snapshot per transaksi —
              histori tidak berubah saat rate diubah.
            </p>
          </div>
          <div className="rounded-[14px] border border-line bg-paper p-5 sm:p-6">
            <h2 className="font-bold">Contoh hitungan</h2>
            <p className="mt-2 text-sm leading-6 text-ink/60">
              Booking {formatIDR(500000)} dengan komisi {commission.toFixed(0)}
              %: platform {formatIDR(Math.round(500000 * commission) / 100)},
              vendor terima sisanya dikurangi refund/liabilitas.
            </p>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Metric, WorkspaceHeader, WorkspaceShell } from "../../components/workspace-shell";
import { useAuth } from "../../components/providers";
import { api } from "../../lib/api";

interface AuditRow {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface BookingRow {
  id: string;
  booking_code: string;
  status: string;
}

export default function AdminRiskPage() {
  const { token } = useAuth();
  const audit = useQuery({
    queryKey: ["admin-audit-risk"],
    queryFn: () => api.get<AuditRow[]>("/admin/audit", token),
    enabled: Boolean(token),
  });
  const bookings = useQuery({
    queryKey: ["admin-bookings-risk"],
    queryFn: () => api.get<BookingRow[]>("/admin/bookings", token),
    enabled: Boolean(token),
  });

  const logs = audit.data ?? [];
  const mismatches = logs.filter(
    (l) => l.resource_type === "Payment" && (l.metadata as { reason?: string } | null)?.reason === "AMOUNT_MISMATCH"
  );
  const failedPayments = logs.filter(
    (l) => (l.metadata as { reason?: string } | null)?.reason === "PAYMENT_FAILED"
  );
  const expired = (bookings.data ?? []).filter((b) => b.status === "EXPIRED").length;

  return (
    <WorkspaceShell role="admin" current="/admin/risk">
      <WorkspaceHeader
        eyebrow="Abuse / Risk"
        title="Antrean risiko."
        description="Mismatch pembayaran, webhook gagal, dan booking expired — bukti untuk rekonsiliasi dan dispute."
      />
      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        <Metric label="Amount mismatch" value={audit.isLoading ? "…" : String(mismatches.length)} hint="Perlu investigasi" />
        <Metric label="Webhook gagal" value={audit.isLoading ? "…" : String(failedPayments.length)} hint="Ditolak / expired" />
        <Metric label="Booking expired" value={bookings.isLoading ? "…" : String(expired)} hint="Kapasitas dilepas" />
      </div>
      <div className="mt-8 space-y-3">
        {[...mismatches, ...failedPayments].slice(0, 30).map((l) => (
          <article key={l.id} className="rounded-[12px] border border-line bg-paper px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-xs font-bold">
                {(l.metadata as { reason?: string } | null)?.reason ?? l.action} · {l.resource_type}
              </p>
              <span className="font-mono text-[11px] text-ink/45">{l.created_at.slice(0, 19).replace("T", " ")}</span>
            </div>
            <pre className="mt-2 overflow-x-auto rounded-[8px] bg-soft p-3 font-mono text-[11px] leading-5 text-ink/60">
              {JSON.stringify({ resource_id: l.resource_id, ...l.metadata }, null, 1)}
            </pre>
          </article>
        ))}
        {!audit.isLoading && mismatches.length === 0 && failedPayments.length === 0 && (
          <p className="rounded-[12px] border border-dashed border-line bg-paper px-5 py-10 text-center text-sm text-ink/55">
            Bersih — tidak ada mismatch pembayaran. Cek <Link href="/admin/transactions" className="font-bold text-coral-dark underline underline-offset-4">transaksi</Link> untuk rekonsiliasi rutin.
          </p>
        )}
      </div>
    </WorkspaceShell>
  );
}

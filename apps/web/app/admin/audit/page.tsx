"use client";

import { useQuery } from "@tanstack/react-query";
import {
  WorkspaceHeader,
  WorkspaceShell,
} from "../../components/workspace-shell";
import { useAuth } from "../../components/providers";
import { api } from "../../lib/api";

interface Log {
  id: string;
  actor_user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string;
  created_at: string;
}

export default function AdminAuditPage() {
  const { authenticated, token } = useAuth();
  const query = useQuery({
    queryKey: ["admin-audit"],
    queryFn: () => api.get<{ logs: Log[] } | Log[]>("/admin/audit", token),
    enabled: Boolean(authenticated),
  });
  const logs = Array.isArray(query.data)
    ? query.data
    : (query.data?.logs ?? []);

  return (
    <WorkspaceShell role="admin" current="/admin/audit">
      <WorkspaceHeader
        eyebrow="Audit logs"
        title="Jejak audit."
        description="Setiap aksi kritis dan event sistem tercatat: siapa, apa, kapan. Tidak bisa dihapus."
      />
      {query.isLoading ? (
        <div
          className="mt-8 h-64 animate-pulse rounded-[12px] bg-paper"
          aria-busy="true"
          aria-label="Memuat audit"
        />
      ) : logs.length === 0 ? (
        <p className="mt-8 rounded-[12px] border border-dashed border-line bg-paper px-5 py-10 text-center text-sm text-ink/55">
          Belum ada jejak audit.
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-[12px] border border-line bg-paper">
          <table className="w-full min-w-[720px] border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.1em] text-ink/45">
                <th className="px-5 py-3 font-bold">Waktu</th>
                <th className="px-5 py-3 font-bold">Actor</th>
                <th className="px-5 py-3 font-bold">Action</th>
                <th className="px-5 py-3 font-bold">Resource</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-3 text-ink/55">
                    {new Date(l.created_at).toLocaleString("id-ID")}
                  </td>
                  <td className="px-5 py-3">
                    {l.actor_user_id ? l.actor_user_id.slice(0, 8) : "system"}
                  </td>
                  <td className="px-5 py-3 font-bold">{l.action}</td>
                  <td className="px-5 py-3 text-ink/65">
                    {l.resource_type} · {l.resource_id.slice(0, 8)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </WorkspaceShell>
  );
}

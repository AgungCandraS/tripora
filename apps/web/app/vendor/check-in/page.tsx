import type { Metadata } from "next";
import { CheckinClient } from "../../components/checkin-client";
import { WorkspaceHeader, WorkspaceShell } from "../../components/workspace-shell";

export const metadata: Metadata = { title: "Vendor check-in | Tripora", robots: { index: false, follow: false } };

export default function VendorCheckinPage() {
  return <WorkspaceShell role="vendor" current="/vendor/check-in"><WorkspaceHeader eyebrow="Operations" title="QR check-in." description="Verifikasi ticket peserta dari perangkat mobile sebelum aktivitas dimulai." /><CheckinClient /></WorkspaceShell>;
}

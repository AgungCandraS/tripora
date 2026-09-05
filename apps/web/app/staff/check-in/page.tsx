import { CheckinClient } from "../../components/checkin-client";
import { WorkspaceHeader, WorkspaceShell } from "../../components/workspace-shell";

export default function StaffCheckinPage() {
  return (
    <WorkspaceShell role="staff" current="/staff/check-in">
      <WorkspaceHeader
        eyebrow="Ticket scanning"
        title="Scan QR di lapangan."
        description="Satu tangan, kamera HP. Token terverifikasi, double-scan ditolak otomatis." />
      <CheckinClient />
    </WorkspaceShell>
  );
}

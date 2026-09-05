"use client";

import { ProfileClient } from "../../components/profile-client";
import { WorkspaceHeader, WorkspaceShell } from "../../components/workspace-shell";

export default function StaffProfilePage() {
  return (
    <WorkspaceShell role="staff" current="/staff/profile">
      <WorkspaceHeader
        eyebrow="Profil akun"
        title="Akun staff."
        description="Identitas dan keamanan akun lapanganmu."
      />
      <ProfileClient />
    </WorkspaceShell>
  );
}

"use client";

import { ProfileClient } from "../../components/profile-client";
import { WorkspaceHeader, WorkspaceShell } from "../../components/workspace-shell";

export default function AdminProfilePage() {
  return (
    <WorkspaceShell role="admin" current="/admin/profile">
      <WorkspaceHeader
        eyebrow="Profil akun"
        title="Akun admin."
        description="Identitas dan keamanan akun platformmu. Aksi kritis tetap tercatat di audit log."
      />
      <ProfileClient />
    </WorkspaceShell>
  );
}

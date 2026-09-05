"use client";

import { ProfileClient } from "../../components/profile-client";
import { WorkspaceHeader, WorkspaceShell } from "../../components/workspace-shell";

export default function AccountProfilePage() {
  return (
    <WorkspaceShell role="customer" current="/account/profile">
      <WorkspaceHeader
        eyebrow="Profil akun"
        title="Identitas & keamanan."
        description="Kelola nama, WhatsApp, dan password. Ini profil akunmu — beda dengan halaman lain."
      />
      <ProfileClient />
    </WorkspaceShell>
  );
}

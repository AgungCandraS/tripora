"use client";

import { ProfileClient } from "../../components/profile-client";
import { WorkspaceHeader, WorkspaceShell } from "../../components/workspace-shell";

export default function VendorProfilePage() {
  return (
    <WorkspaceShell role="vendor" current="/vendor/profile">
      <WorkspaceHeader
        eyebrow="Profil akun"
        title="Akun owner."
        description="Identitas dan keamanan akun pribadimu. Profil bisnis diatur di Onboarding & Settings vendor."
      />
      <ProfileClient />
    </WorkspaceShell>
  );
}

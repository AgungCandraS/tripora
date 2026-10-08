"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ActivityCard } from "../../components/activity-card";
import {
  WorkspaceHeader,
  WorkspaceShell,
} from "../../components/workspace-shell";
import { useAuth } from "../../components/providers";
import { api } from "../../lib/api";
import type { ApiActivity } from "../../lib/types";

interface WishlistRow {
  activity: ApiActivity;
}

export default function WishlistPage() {
  const { authenticated, token } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["wishlist"],
    queryFn: () => api.get<{ wishlist: WishlistRow[] }>("/me/wishlist", token),
    enabled: Boolean(authenticated),
  });
  const rows = query.data?.wishlist ?? [];

  async function remove(activityId: string) {
    await api.del("/me/wishlist/" + activityId, token);
    await queryClient.invalidateQueries({ queryKey: ["wishlist"] });
  }

  return (
    <WorkspaceShell role="customer" current="/account/wishlist">
      <WorkspaceHeader
        eyebrow="Wishlist"
        title="Yang ingin kamu coba."
        description="Tersimpan di akunmu — sinkron di semua perangkat."
      />
      {query.isLoading ? (
        <div
          className="mt-8 grid animate-pulse gap-5 md:grid-cols-3"
          aria-busy="true"
          aria-label="Memuat wishlist"
        >
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-72 rounded-[16px] bg-paper" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-8 rounded-[12px] border border-dashed border-line bg-paper px-5 py-10 text-center text-sm text-ink/55">
          Wishlist kosong. Simpan aktivitas dari halaman explore.{" "}
          <Link
            href="/explore"
            className="font-bold text-coral-dark underline underline-offset-4"
          >
            Explore
          </Link>
        </p>
      ) : (
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {rows.map(({ activity }, i) => (
            <div key={activity.id} className="relative">
              <ActivityCard activity={activity} index={i} />
              <button
                type="button"
                onClick={() => remove(activity.id)}
                aria-label={`Hapus ${activity.title} dari wishlist`}
                className="absolute right-3 top-3 rounded-full bg-ink/75 px-3 py-1.5 text-[11px] font-bold text-paper backdrop-blur-sm hover:bg-ink"
              >
                Hapus
              </button>
            </div>
          ))}
        </div>
      )}
    </WorkspaceShell>
  );
}

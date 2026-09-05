"use client";

import { motion } from "framer-motion";
import { Clock, MapPin, Star } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { formatIDR } from "../lib/api";
import { durationText, imageFor, minPrice, ratingText, type ApiActivity } from "../lib/types";

export function ActivityCard({ activity, index = 0 }: { activity: ApiActivity; index?: number }) {
  const category = activity.categories?.[0]?.category.name ?? "Aktivitas";
  const place = activity.destination?.name ?? "";
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55, delay: (index % 3) * 0.08, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4 }}
      className="image-card group overflow-hidden rounded-[16px] border border-line bg-paper transition-shadow duration-300 hover:shadow-[0_18px_45px_rgba(16,35,30,0.12)]"
    >
      <Link href={`/activities/${activity.slug}`} aria-label={`Lihat ${activity.title}`}>
        <div className="relative aspect-[1.12] overflow-hidden bg-sage">
          <Image
            src={imageFor(activity)}
            alt={activity.title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="card-image object-cover"
          />
          <span className="absolute left-3 top-3 rounded-full bg-ink/75 px-2.5 py-1.5 text-[11px] font-bold text-paper backdrop-blur-sm">
            {category}
          </span>
          {activity.rating_count > 0 && (
            <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-paper/95 px-2.5 py-1.5 text-[11px] font-bold text-ink">
              <Star size={12} weight="fill" className="text-coral-dark" />
              {ratingText(activity)} · {activity.rating_count} ulasan
            </span>
          )}
        </div>
        <div className="p-4 sm:p-5">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-ink/55">
            <MapPin size={13} weight="fill" className="text-coral-dark" />
            {place}
            {activity.vendor ? ` · ${activity.vendor.name}` : ""}
          </p>
          <h3 className="mt-2 text-lg font-bold leading-snug tracking-[-0.03em] text-ink transition-colors group-hover:text-coral-dark">
            {activity.title}
          </h3>
          <div className="mt-4 flex items-end justify-between gap-3 border-t border-line pt-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink/45">
                Mulai dari
              </p>
              <p className="mt-1 text-base font-bold text-ink">
                {formatIDR(minPrice(activity))}{" "}
                <span className="text-xs font-medium text-ink/50">/ orang</span>
              </p>
            </div>
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink/55">
              <Clock size={14} className="text-coral-dark" />
              {durationText(activity)}
            </p>
          </div>
          <span className="mt-4 inline-flex w-full items-center justify-center rounded-[10px] bg-ink px-4 py-2.5 text-sm font-bold text-paper transition group-hover:bg-moss">
            Lihat slot & paket
          </span>
        </div>
      </Link>
    </motion.article>
  );
}

"use client";
import {
  Heart,
  MapPin,
  ArrowUpRight,
  ImageSquare,
} from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Place } from "../lib/place-types";

export function readSavedPlaces(): string[] {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem("tripora_saved_places") ?? "[]",
    );
    return Array.isArray(value)
      ? value
          .filter((id): id is string => typeof id === "string")
          .slice(0, 1000)
      : [];
  } catch {
    return [];
  }
}
export function SavePlace({
  id,
  label = false,
}: {
  id: string;
  label?: boolean;
}) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const sync = () => setSaved(readSavedPlaces().includes(id));
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("tripora-saved", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("tripora-saved", sync);
    };
  }, [id]);
  function toggle() {
    try {
      const ids = readSavedPlaces();
      localStorage.setItem(
        "tripora_saved_places",
        JSON.stringify(
          saved
            ? ids.filter((value) => value !== id)
            : [...new Set([...ids, id])],
        ),
      );
      window.dispatchEvent(new Event("tripora-saved"));
      setError("");
    } catch {
      setError("Penyimpanan browser tidak tersedia.");
    }
  }
  return (
    <span>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={saved}
        aria-label={saved ? "Hapus dari tempat tersimpan" : "Simpan tempat"}
        className={`save-place ${saved ? "is-saved" : ""}`}
      >
        <Heart size={20} weight={saved ? "fill" : "regular"} />
        {label && <span>{saved ? "Tersimpan" : "Simpan tempat"}</span>}
      </button>
      {error && (
        <span role="alert" className="block text-xs text-coral-dark">
          {error}
        </span>
      )}
    </span>
  );
}
export function PlacePhoto({
  place,
  priority = false,
}: {
  place: Pick<Place, "name" | "photo" | "categoryLabel">;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (!place.photo || failed)
    return (
      <div className="photo-placeholder">
        <ImageSquare size={36} weight="light" />
        <span>Foto belum tersedia</span>
      </div>
    );
  return (
    <Image
      src={place.photo}
      alt={place.name}
      fill
      unoptimized
      priority={priority}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      onError={() => setFailed(true)}
      className="card-image object-cover"
    />
  );
}
export function PlaceCard({ place }: { place: Place }) {
  return (
    <article className="place-card group">
      <div className="place-card-photo">
        <Link href={`/places/${place.slug}`} tabIndex={-1} aria-hidden="true">
          <PlacePhoto place={place} />
        </Link>
        <div className="absolute right-3 top-3">
          <SavePlace id={place.id} />
        </div>
        <span className="place-category">
          {place.subcategory ?? place.categoryLabel}
        </span>
      </div>
      <div className="pt-4">
        <p className="flex items-center gap-1.5 text-sm text-ink/65">
          <MapPin size={15} />
          {place.area}
        </p>
        <h3 className="mt-1.5 text-xl font-bold tracking-tight">
          <Link
            href={`/places/${place.slug}`}
            className="hover:text-coral-dark"
          >
            {place.name}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink/65">
          {place.address}
        </p>
        <Link
          href={`/places/${place.slug}`}
          className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-moss"
        >
          Lihat tempat <ArrowUpRight size={17} />
        </Link>
      </div>
    </article>
  );
}

import "server-only";
import data from "../../data/places.json";
import type { Place, PlaceResults } from "./place-types";

export const places = data as Place[];
export const areas = [...new Set(places.map((place) => place.area))].sort();

export function searchPlaces(params: URLSearchParams): PlaceResults {
  const q = (params.get("q") ?? "").trim().toLocaleLowerCase("id-ID");
  const category = params.get("category");
  const area = params.get("area");
  const saved = params.has("ids")
    ? new Set((params.get("ids") ?? "").split(","))
    : null;
  const page = Math.max(
    1,
    Math.min(100, Math.trunc(Number(params.get("page")) || 1)),
  );
  const result = places.filter(
    (place) =>
      (!category || place.category === category) &&
      (!area || place.area === area) &&
      (!saved || saved.has(place.id)) &&
      (!q ||
        `${place.name} ${place.subcategory} ${place.address}`
          .toLocaleLowerCase("id-ID")
          .includes(q)),
  );
  result.sort((a, b) =>
    params.get("sort") === "name"
      ? a.name.localeCompare(b.name, "id")
      : Number(Boolean(b.photo)) - Number(Boolean(a.photo)) ||
        b.reviewCount - a.reviewCount ||
        a.name.localeCompare(b.name, "id"),
  );
  return {
    places: result.slice((page - 1) * 12, page * 12),
    total: result.length,
    page,
    pageSize: 12,
    areas,
  };
}

export function featuredPlaces(category: string, count = 4) {
  return places
    .filter((place) => place.category === category && place.photo)
    .sort((a, b) => b.reviewCount - a.reviewCount)
    .slice(0, count);
}

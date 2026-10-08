"""Build the read-only public catalog; never create vendors, prices or bookings."""

import argparse
import hashlib
import json
import math
import re
from pathlib import Path
from urllib.parse import urlencode, urlparse

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = Path(r"D:\Project\scrapper data\scrapper bandung\places.json")


def safe_url(value, photo=False):
    if not isinstance(value, str):
        return None
    parsed = urlparse(value.strip())
    if parsed.scheme not in ("http", "https") or not parsed.hostname or parsed.username or parsed.password:
        return None
    if photo and (parsed.scheme != "https" or parsed.hostname != "lh3.googleusercontent.com"):
        return None
    return value.strip()


def infer_area(row):
    address = str(row.get("address", "")).lower()
    text = address
    if any(area in text for area in ("lembang", "parongpong", "cisarua")):
        return "Lembang"
    if "pangalengan" in text:
        return "Pangalengan"
    if "ciwidey" in text or "rancabali" in text or "pasirjambu" in text:
        return "Ciwidey"
    if "cimahi" in address:
        return "Cimahi"
    if "bandung barat" in address:
        return "Bandung Barat"
    if "kabupaten bandung" in address:
        return "Kabupaten Bandung"
    if "kota bandung" in address:
        return "Bandung Kota"
    return "Bandung Raya"


def normalize(rows):
    accepted, rejected, seen = [], [], set()
    for row in rows:
        place_id = str(row.get("place_id") or "").strip()
        name = str(row.get("name") or "").strip()
        reason = None
        try:
            lat, lng = float(row["latitude"]), float(row["longitude"])
            if not math.isfinite(lat) or not math.isfinite(lng) or not (-7.4 <= lat <= -6.65 and 107.2 <= lng <= 108):
                reason = "Outside broad Bandung coordinate bounds"
        except (KeyError, TypeError, ValueError):
            reason = "Missing or invalid coordinates"
        if not place_id or not name:
            reason = "Missing identity"
        if place_id in seen:
            reason = "Duplicate place id"
        if reason:
            rejected.append({"id": place_id, "name": name, "reason": reason})
            continue
        seen.add(place_id)
        ascii_name = name.lower()
        slug = re.sub(r"[^a-z0-9]+", "-", ascii_name).strip("-") or "tempat"
        reviews = max(0, int(row.get("reviews_count") or 0))
        rating = row.get("rating")
        rating = rating if isinstance(rating, (float, int)) and math.isfinite(rating) and 0 < rating <= 5 and rating != 4.5 and reviews > 0 else None
        accepted.append({
            "id": place_id, "slug": f"{slug}-{hashlib.sha256(place_id.encode()).hexdigest()[:8]}", "name": name,
            "category": row.get("category_group"), "categoryLabel": row.get("category_group_label"),
            "subcategory": row.get("sub_category") or None, "area": infer_area(row), "district": row.get("district") or None,
            "address": row.get("address") or "Alamat belum tersedia", "latitude": lat, "longitude": lng,
            "phone": row.get("phone") or None, "website": safe_url(row.get("website")), "photo": safe_url(row.get("photo_url"), photo=True),
            "mapsUrl": "https://www.google.com/maps/search/?" + urlencode({"api": 1, "query": f"{lat},{lng}", "query_place_id": place_id}, safe=","),
            "rating": rating, "reviewCount": reviews if rating is not None else 0, "updatedAt": str(row.get("updated_at") or "")[:10], "source": "Google Maps",
        })
    return accepted, rejected


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, nargs="?", default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=ROOT / "apps/web/data/places.json")
    parser.add_argument("--quarantine", type=Path, default=ROOT / "audit/bandung-quarantine.json")
    args = parser.parse_args()
    rows = json.loads(args.source.read_text(encoding="utf-8-sig"))
    if not isinstance(rows, list) or not all(isinstance(row, dict) for row in rows):
        raise ValueError("Expected an array of place objects")
    if args.source.resolve() in (args.output.resolve(), args.quarantine.resolve()):
        raise ValueError("Source must not be overwritten")
    accepted, rejected = normalize(rows)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.quarantine.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(accepted, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    args.quarantine.write_text(json.dumps(rejected, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"accepted": len(accepted), "quarantined": len(rejected), "photos": sum(bool(row["photo"]) for row in accepted)}))


if __name__ == "__main__":
    main()

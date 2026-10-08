"""Read-only profiling of a Bandung places JSON export; never imports into the DB."""

import argparse
import collections
import hashlib
import json
import math
from pathlib import Path
from urllib.parse import urlparse


def profile(source: Path) -> dict:
    raw = source.read_bytes()
    rows = json.loads(raw.decode("utf-8-sig"))
    if not isinstance(rows, list) or not all(isinstance(row, dict) for row in rows):
        raise ValueError("Expected a JSON array of place objects")

    def counts(field):
        return dict(collections.Counter(str(row.get(field, "")) for row in rows).most_common())

    def present(value):
        return value is not None and value != "" and value != [] and value != {}

    def coordinates(row):
        try:
            lat, lng = float(row["latitude"]), float(row["longitude"])
            return (lat, lng) if math.isfinite(lat) and math.isfinite(lng) else None
        except (KeyError, ValueError, TypeError):
            return None

    ids = collections.Counter(row.get("place_id") for row in rows if row.get("place_id"))
    names = collections.Counter(str(row.get("name", "")).strip().casefold() for row in rows)
    fields = sorted({key for row in rows for key in row})
    photo_hosts = collections.Counter(urlparse(str(row.get("photo_url", ""))).hostname or "missing" for row in rows)
    valid_coordinates = [coordinates(row) for row in rows if coordinates(row) is not None]
    # Broad screening box, NOT an administrative boundary for Bandung Raya.
    bounds = {"lat_min": -7.4, "lat_max": -6.65, "lng_min": 107.2, "lng_max": 108.0}
    outside = []
    for row in rows:
        point = coordinates(row)
        if point and not (bounds["lat_min"] <= point[0] <= bounds["lat_max"] and bounds["lng_min"] <= point[1] <= bounds["lng_max"]):
            outside.append({key: row.get(key) for key in ("place_id", "name", "address", "latitude", "longitude")})

    return {
        "source_file": str(source.resolve()),
        "source_sha256": hashlib.sha256(raw).hexdigest(),
        "record_count": len(rows),
        "unique_place_ids": len(ids),
        "duplicate_place_ids": {key: value for key, value in ids.items() if value > 1},
        "duplicate_exact_normalized_names": {key: value for key, value in names.items() if key and value > 1},
        "category_counts": counts("category_group"),
        "district_counts": counts("district"),
        "populated_field_counts": {field: sum(present(row.get(field)) for row in rows) for field in fields},
        "photo_host_counts": dict(photo_hosts),
        "unique_photo_urls": len({row.get("photo_url") for row in rows if row.get("photo_url")}),
        "zero_review_count_records": sum(row.get("reviews_count") == 0 for row in rows),
        "rating_equal_to_scraper_default_4_5": sum(row.get("rating") == 4.5 for row in rows),
        "price_tier_counts": counts("price_tier"),
        "open_status_counts": counts("open_status"),
        "hours_unknown_records": sum(row.get("hours_summary") == "Hubungi tempat untuk info jam buka" for row in rows),
        "landline_prefix_022_021_025_026_with_whatsapp": sum(str(row.get("phone", "")).startswith(("022", "021", "025", "026")) and bool(row.get("whatsapp")) for row in rows),
        "valid_numeric_coordinates": len(valid_coordinates),
        "scraper_default_coordinates": sum(point == (-6.9175, 107.6191) for point in valid_coordinates),
        "coordinate_screening_bounds": bounds,
        "outside_screening_bounds_candidates": outside,
        "updated_at_min": min((str(row.get("updated_at", "")) for row in rows), default=None),
        "updated_at_max": max((str(row.get("updated_at", "")) for row in rows), default=None),
        "limitations": [
            "Counts measure export contents, not independently verified facts about venues.",
            "The screening box flags candidates; use authoritative boundaries or manual review to decide inclusion.",
            "A 4.5 rating can be genuine or a scraper fallback; this export cannot distinguish them.",
            "Photo URLs have not been fetched; host presence does not establish authenticity, availability or reuse permission.",
            "WhatsApp URLs are not evidence that a telephone number has an active WhatsApp account.",
        ],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    report = profile(args.source)
    rendered = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered, encoding="utf-8")
        print(json.dumps({"record_count": report["record_count"], "categories": report["category_counts"], "output": str(args.output)}, ensure_ascii=False))
    else:
        print(rendered, end="")


if __name__ == "__main__":
    main()

import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("bandung_import", Path(__file__).with_name("import-bandung-places.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class CatalogSafety(unittest.TestCase):
    def row(self, **changes):
        return {"place_id": "known-id", "name": "Cafe Test", "latitude": -6.9, "longitude": 107.6,
                "address": "Kota Bandung", "category_group": "cafe_ngopi", "category_group_label": "Ngopi",
                "rating": 4.5, "reviews_count": 500, "price_tier": "made up", "whatsapp": "guessed",
                "open_status": "assumed", "photo_url": "https://images.unsplash.com/stock", **changes}

    def test_unverified_fields_and_stock_are_removed(self):
        places, rejected = module.normalize([self.row()])
        self.assertEqual(rejected, [])
        self.assertIsNone(places[0]["rating"])
        self.assertIsNone(places[0]["photo"])
        self.assertEqual(places[0]["reviewCount"], 0)
        self.assertFalse({"price_tier", "whatsapp", "open_status"}.intersection(places[0]))

    def test_outliers_invalid_coordinates_and_duplicates_are_quarantined(self):
        places, rejected = module.normalize([self.row(), self.row(), self.row(place_id="outlier", longitude=117.8), self.row(place_id="invalid", latitude=float("nan"))])
        self.assertEqual(len(places), 1)
        self.assertEqual(len(rejected), 3)

    def test_urls_and_rating_require_valid_evidence(self):
        self.assertIsNone(module.safe_url("javascript:alert(1)"))
        self.assertIsNone(module.safe_url("https://user:secret@example.com"))
        self.assertIsNone(module.safe_url("https://lh3.googleusercontent.com.attacker.test/photo", photo=True))
        places, _ = module.normalize([self.row(rating=4.7, reviews_count=0), self.row(place_id="real", rating=4.7, photo_url="https://lh3.googleusercontent.com/photo")])
        self.assertIsNone(places[0]["rating"])
        self.assertEqual(places[1]["rating"], 4.7)
        self.assertEqual(places[1]["photo"], "https://lh3.googleusercontent.com/photo")


if __name__ == "__main__":
    unittest.main()

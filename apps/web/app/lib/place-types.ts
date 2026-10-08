export interface Place {
  id: string;
  slug: string;
  name: string;
  category: string;
  categoryLabel: string;
  subcategory: string | null;
  area: string;
  district: string | null;
  address: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  website: string | null;
  photo: string | null;
  mapsUrl: string;
  rating: number | null;
  reviewCount: number;
  updatedAt: string;
  source: string;
}

export const placeCategories = [
  { slug: "", label: "Semua tempat" },
  { slug: "wisata", label: "Wisata & alam" },
  { slug: "hiburan_main", label: "Main & hiburan" },
  { slug: "cafe_ngopi", label: "Ngopi" },
  { slug: "kuliner_resto", label: "Makan" },
];

export interface PlaceResults {
  places: Place[];
  total: number;
  page: number;
  pageSize: number;
  areas: string[];
}

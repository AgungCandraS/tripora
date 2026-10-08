import "server-only";
import { areas, places } from "./places";

const descriptions: Record<string, string> = {
  "Bandung Kota":
    "Mulai dari kopi, makan siang, atau tempat main di tengah kota. Pilih lokasi yang berdekatan untuk mengurangi waktu di perjalanan.",
  "Bandung Barat":
    "Lihat pilihan tempat di sisi barat Bandung. Periksa alamat dan rute sebelum berangkat agar rencanamu tetap nyaman.",
  "Bandung Raya":
    "Tempat dengan area yang belum dapat ditentukan dari alamat sumber. Gunakan lokasi di peta untuk memastikan tujuannya.",
  "Kabupaten Bandung":
    "Jelajahi pilihan di luar pusat kota. Cocokkan jarak, transportasi, dan waktu perjalanan dengan rencanamu.",
  Cimahi:
    "Cari tempat makan, ngopi, dan main di sekitar Cimahi. Mulai dari tempat terdekat atau simpan beberapa pilihan untuk nanti.",
  Ciwidey:
    "Susun perjalanan ke selatan Bandung dengan pilihan tempat di sekitar Ciwidey. Konfirmasi kondisi perjalanan dan jam buka kepada pengelola.",
  Lembang:
    "Cari tempat main dan berhenti ngopi di sekitar Lembang. Periksa rute serta jam buka sebelum memilih urutan perjalanan.",
  Pangalengan:
    "Lihat tempat di sekitar Pangalengan, lalu simpan pilihan yang ingin kamu kunjungi. Konfirmasi akses dan kebutuhan perjalanan kepada pengelola.",
};

export const areaGuides = areas.map((name) => {
  const matches = places.filter((place) => place.area === name);
  const ordered = [...matches].sort(
    (a, b) =>
      Number(Boolean(b.photo)) - Number(Boolean(a.photo)) ||
      b.reviewCount - a.reviewCount,
  );
  return {
    name,
    slug: name.toLowerCase().replace(/\s+/g, "-"),
    description: descriptions[name] ?? descriptions["Bandung Raya"],
    count: matches.length,
    cover: ordered.find((place) => place.photo) ?? ordered[0],
    places: ordered.slice(0, 12),
  };
});

export function areaGuide(slug: string) {
  const aliases: Record<string, string> = {
    bandung: "bandung-kota",
    "kab-bandung": "kabupaten-bandung",
    dago: "bandung-kota",
  };
  return areaGuides.find((guide) => guide.slug === (aliases[slug] ?? slug));
}

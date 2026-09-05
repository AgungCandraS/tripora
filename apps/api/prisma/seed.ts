import { PrismaClient, RoleCode } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type SeedPackage = { name: string; price: number; minutes: number; min?: number; max?: number; desc?: string };
type SeedActivity = {
  slug: string; title: string; short: string; desc: string; dest: string; vendor: string;
  cats: string[]; minAge: number; lat: number; lng: number; packages: SeedPackage[];
};

const DESTS: Array<{ slug: string; name: string; desc: string; lat: number; lng: number }> = [
  { slug: "bandung", name: "Bandung City", desc: "Heritage, taman kota, museum, dan kuliner dalam satu rute.", lat: -6.9175, lng: 107.6191 },
  { slug: "lembang", name: "Lembang", desc: "Udara sejuk, family attraction, dan lanskap perbukitan.", lat: -6.8111, lng: 107.615 },
  { slug: "ciwidey", name: "Ciwidey", desc: "Danau kawah, kebun teh, camping, dan pengalaman alam.", lat: -7.1667, lng: 107.45 },
  { slug: "pangalengan", name: "Pangalengan", desc: "Rafting, kebun teh, dan rute hijau untuk hari yang panjang.", lat: -7.05, lng: 107.57 },
  { slug: "dago", name: "Dago", desc: "Jeda singkat dekat kota dengan alam dan kuliner kreatif.", lat: -6.8853, lng: 107.6133 },
  { slug: "bandung-barat", name: "Bandung Barat", desc: "Ruang terbuka, danau, dan aktivitas di tepian kota.", lat: -6.84, lng: 107.51 },
];

const VENDORS = [
  { slug: "palayangan-river-club", name: "Palayangan River Club", email: "dimas@palayangan.id", owner: "Dimas A.", phone: "081234567890" },
  { slug: "lembang-adventure", name: "Lembang Adventure", email: "siti@lembang-adventure.id", owner: "Siti Rahma", phone: "081234567891" },
  { slug: "ranca-upas-camp", name: "Ranca Upas Camp", email: "agus@rancaupas.id", owner: "Agus Wijaya", phone: "081234567892" },
  { slug: "bandung-stories", name: "Bandung Stories", email: "rara@bandungstories.id", owner: "Rara Kirana", phone: "081234567893" },
];

const ACTIVITIES: SeedActivity[] = [
  {
    slug: "rafting-sungai-palayangan", title: "Rafting Sungai Palayangan",
    short: "Arus sungai dan jalur alam untuk akhir pekan yang lebih aktif.",
    desc: "Rasakan arus Sungai Palayangan sepanjang 5 km bersama pemandu bersertifikat. Termasuk briefing keselamatan, perlengkapan lengkap, dan dokumentasi dasar.",
    dest: "pangalengan", vendor: "palayangan-river-club", cats: ["rafting"], minAge: 10, lat: -7.05, lng: 107.57,
    packages: [
      { name: "River Adventure", price: 185000, minutes: 180, desc: "Rafting bersama, briefing + perlengkapan lengkap." },
      { name: "Private River Run", price: 275000, minutes: 180, desc: "Grup privat, ritme lebih fleksibel." },
    ],
  },
  {
    slug: "atv-pangalengan", title: "ATV Adventure Pangalengan",
    short: "Jalur tanah kebun teh dengan tiga level track.",
    desc: "Jelajahi jalur tanah, sungai kecil, dan kebun teh Pangalengan dengan ATV 250cc. Briefing + pemandu jalur untuk semua level.",
    dest: "pangalengan", vendor: "palayangan-river-club", cats: ["atv"], minAge: 12, lat: -7.052, lng: 107.572,
    packages: [
      { name: "Short Track", price: 100000, minutes: 30, desc: "Track pemula 30 menit." },
      { name: "Adventure Track", price: 175000, minutes: 60, desc: "Track menengah 60 menit." },
      { name: "Extreme Track", price: 300000, minutes: 120, desc: "Rute penuh 120 menit." },
    ],
  },
  {
    slug: "atv-lembang-forest", title: "ATV Lembang Forest Track",
    short: "Jalur hutan pinus Lembang yang sejuk.",
    desc: "Track ATV menembus hutan pinus dan kebun sayur Lembang. Cocok untuk pemula maupun pengendara berpengalaman.",
    dest: "lembang", vendor: "lembang-adventure", cats: ["atv"], minAge: 12, lat: -6.812, lng: 107.616,
    packages: [
      { name: "Adventure Track", price: 175000, minutes: 60, desc: "Satu sesi ATV + perlengkapan." },
      { name: "Extreme Track", price: 300000, minutes: 120, desc: "Rute panjang + tanjakan." },
    ],
  },
  {
    slug: "glamping-ranca-upas", title: "Glamping di Ranca Upas",
    short: "Bangun pagi di antara udara dingin dan lanskap hijau.",
    desc: "Tenda siap huni di kawasan Ranca Upas, Ciwidey. Termasuk sarapan, akses api unggun, dan penangkaran rusa.",
    dest: "ciwidey", vendor: "ranca-upas-camp", cats: ["camping", "family-activity"], minAge: 5, lat: -7.1667, lng: 107.45,
    packages: [
      { name: "Forest Tent", price: 420000, minutes: 1440, min: 2, max: 2, desc: "Menginap 2D1N untuk dua orang + sarapan." },
      { name: "Family Camp", price: 680000, minutes: 1440, min: 2, max: 4, desc: "Tenda keluarga kapasitas empat orang." },
    ],
  },
  {
    slug: "family-camp-lakeside", title: "Family Camp Lakeside",
    short: "Sehari bermain di alam bersama keluarga.",
    desc: "Day camp tepi danau Bandung Barat: aktivitas anak, area piknik, dan pemandu lapangan.",
    dest: "bandung-barat", vendor: "lembang-adventure", cats: ["family-activity"], minAge: 5, lat: -6.84, lng: 107.51,
    packages: [{ name: "Day Camp", price: 230000, minutes: 480, desc: "Akses area + rangkaian aktivitas keluarga." }],
  },
  {
    slug: "city-heritage-walk", title: "City Heritage Walk",
    short: "Cerita kota dari Asia Afrika hingga Braga.",
    desc: "Jalan kaki 2,5 jam menyusuri koridor heritage Bandung bersama storyteller lokal. Maksimal 10 peserta per grup.",
    dest: "bandung", vendor: "bandung-stories", cats: ["tour"], minAge: 8, lat: -6.9175, lng: 107.6191,
    packages: [{ name: "Morning Walk", price: 120000, minutes: 150, max: 10, desc: "Tur kecil + rekomendasi kuliner." }],
  },
  {
    slug: "workshop-kopi-gunung", title: "Workshop Kopi Gunung",
    short: "Dari biji sampai seduhan bersama roaster lokal.",
    desc: "Sesi cupping, pengenalan roasting, dan teknik seduh. Pulang membawa satu paket kopi single origin.",
    dest: "dago", vendor: "bandung-stories", cats: ["kuliner"], minAge: 12, lat: -6.8853, lng: 107.6133,
    packages: [{ name: "Basic Cupping", price: 145000, minutes: 120, max: 8, desc: "Cupping + 1 paket kopi." }],
  },
  {
    slug: "trekking-tangkuban-perahu", title: "Trekking Tangkuban Perahu",
    short: "Sunrise trek kawah aktif legendaris.",
    desc: "Trek pagi ke bibir kawah Domas dan Ratu. Termasuk tiket kawasan, pemandu, dan sarapan hangat.",
    dest: "lembang", vendor: "lembang-adventure", cats: ["tour"], minAge: 10, lat: -6.7597, lng: 107.6097,
    packages: [{ name: "Sunrise Trek", price: 150000, minutes: 300, max: 12, desc: "Berangkat 04:30 dari Lembang." }],
  },
];

const SLOTS = [["08:00", "10:00"], ["10:00", "12:00"], ["13:00", "15:00"], ["15:00", "17:00"]];

async function main() {
  for (const code of ["GUEST", "CUSTOMER", "VENDOR_OWNER", "VENDOR_STAFF", "ADMIN"]) {
    await prisma.role.upsert({ where: { code: code as RoleCode }, update: {}, create: { code: code as RoleCode, name: code.replace(/_/g, " ") } });
  }
  for (const code of ["bookings.view", "schedule.view", "ticket.scan", "checkin", "revenue.view", "payout.request", "staff.manage", "promo.manage"]) {
    await prisma.permission.upsert({ where: { code }, update: {}, create: { code, name: code } });
  }
  for (const name of ["Bandung", "Lembang", "Ciwidey", "Pangalengan", "Dago", "Bandung Barat"]) {
    await prisma.region.upsert({ where: { slug: slugify(name) }, update: {}, create: { name, slug: slugify(name), province: "Jawa Barat", country: "Indonesia" } });
  }
  for (const d of DESTS) {
    const region = await prisma.region.findUniqueOrThrow({ where: { slug: d.slug === "bandung" ? "bandung" : d.slug } });
    await prisma.destination.upsert({
      where: { slug: d.slug },
      update: { description: d.desc, latitude: d.lat, longitude: d.lng },
      create: { region_id: region.id, name: d.name, slug: d.slug, description: d.desc, city: "Bandung", province: "Jawa Barat", latitude: d.lat, longitude: d.lng },
    });
    await prisma.$executeRaw`UPDATE destinations SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography WHERE slug = ${d.slug} AND latitude IS NOT NULL`;
  }
  for (const c of [
    { name: "ATV", slug: "atv" }, { name: "Rafting", slug: "rafting" }, { name: "Camping", slug: "camping" },
    { name: "Family Activity", slug: "family-activity" }, { name: "Tour", slug: "tour" }, { name: "Kuliner", slug: "kuliner" },
  ]) {
    await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
  }

  const adminPass = await bcrypt.hash("admin12345", 12);
  await prisma.user.upsert({
    where: { email: "ops@tripora.id" }, update: { email_verified: true },
    create: { email: "ops@tripora.id", full_name: "Ops Tripora", password_hash: adminPass, email_verified: true, roles: { create: { role: { connect: { code: "ADMIN" } } } } },
  });

  // Admin utama (pemilik) — ganti password setelah login pertama via Profil.
  await prisma.user.upsert({
    where: { email: "candraagung877@gmail.com" }, update: { email_verified: true },
    create: { email: "candraagung877@gmail.com", full_name: "Candra Agung", password_hash: adminPass, email_verified: true, roles: { create: { role: { connect: { code: "ADMIN" } } } } },
  });

  for (const v of VENDORS) {
    const pass = await bcrypt.hash("vendor12345", 12);
    const owner = await prisma.user.upsert({
      where: { email: v.email }, update: { email_verified: true },
      create: { email: v.email, full_name: v.owner, password_hash: pass, phone: v.phone, email_verified: true, roles: { create: { role: { connect: { code: "VENDOR_OWNER" } } } } },
    });
    const vendor = await prisma.vendor.upsert({
      where: { slug: v.slug }, update: { status: "APPROVED" },
      create: { owner_user_id: owner.id, name: v.name, slug: v.slug, status: "APPROVED", email: v.email },
    });
    await prisma.vendorMember.upsert({
      where: { vendor_id_user_id: { vendor_id: vendor.id, user_id: owner.id } }, update: {},
      create: { vendor_id: vendor.id, user_id: owner.id, role_name: "VENDOR_OWNER", status: "ACTIVE" },
    });
  }

  // Staff demo untuk Palayangan
  const staffPass = await bcrypt.hash("staff12345", 12);
  const staff = await prisma.user.upsert({
    where: { email: "salsa@palayangan.id" }, update: { email_verified: true },
    create: { email: "salsa@palayangan.id", full_name: "Salsa N.", password_hash: staffPass, email_verified: true, roles: { create: { role: { connect: { code: "VENDOR_STAFF" } } } } },
  });
  const palayangan = await prisma.vendor.findUniqueOrThrow({ where: { slug: "palayangan-river-club" } });
  await prisma.vendorMember.upsert({
    where: { vendor_id_user_id: { vendor_id: palayangan.id, user_id: staff.id } }, update: {},
    create: {
      vendor_id: palayangan.id, user_id: staff.id, role_name: "VENDOR_STAFF", status: "ACTIVE",
      permissions: ["booking.read", "calendar.read", "checkin.scan", "participant.read", "activity.read", "promotion.read", "review.read"],
    },
  });

  for (const a of ACTIVITIES) {
    const vendor = await prisma.vendor.findUniqueOrThrow({ where: { slug: a.vendor } });
    const dest = await prisma.destination.findUniqueOrThrow({ where: { slug: a.dest } });
    const activity = await prisma.activity.upsert({
      where: { slug: a.slug },
      update: { short_description: a.short, description: a.desc, min_age: a.minAge, latitude: a.lat, longitude: a.lng },
      create: {
        vendor_id: vendor.id, destination_id: dest.id, title: a.title, slug: a.slug,
        short_description: a.short, description: a.desc, status: "PUBLISHED", min_age: a.minAge,
        latitude: a.lat, longitude: a.lng,
        categories: { create: a.cats.map((c) => ({ category: { connect: { slug: c } } })) },
      },
    });
    await prisma.$executeRaw`UPDATE activities SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography WHERE id = ${activity.id}::uuid AND latitude IS NOT NULL`;
    for (const p of a.packages) {
      let pkg = await prisma.package.findFirst({ where: { activity_id: activity.id, name: p.name } });
      if (!pkg) {
        pkg = await prisma.package.create({
          data: {
            activity_id: activity.id, name: p.name, description: p.desc, base_price: p.price,
            duration_minutes: p.minutes, min_participants: p.min ?? 1, max_participants: p.max ?? 20, status: "ACTIVE",
          },
        });
      }
      for (const [start, end] of SLOTS) {
        for (const dow of [0, 1, 2, 3, 4, 5, 6]) {
          const existing = await prisma.schedule.findFirst({ where: { package_id: pkg.id, day_of_week: dow, start_time: start } });
          if (!existing) {
            await prisma.schedule.create({ data: { package_id: pkg.id, day_of_week: dow, start_time: start, end_time: end, capacity: 10, status: "ACTIVE" } });
          }
        }
      }
    }
  }

  await prisma.promotion.upsert({
    where: { code: "PAGI10" }, update: {},
    create: { code: "PAGI10", type: "PERCENT", value: 10, usage_limit: 100, status: "ACTIVE" },
  });
  await prisma.promotion.upsert({
    where: { code: "FAMILY15" }, update: {},
    create: { code: "FAMILY15", type: "PERCENT", value: 15, minimum_purchase: 500000, usage_limit: 50, status: "ACTIVE" },
  });

  console.log("Seed complete: roles, regions, destinations+geom, categories, users, vendors, 8 activities, promos.");
}

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

# Tripora (Marketplace Booking Wisata Bandung Raya)

## Overview

Tripora adalah marketplace booking wisata dan aktivitas lokal yang dikembangkan untuk
regional Bandung Raya, Jawa Barat. Sistem ini dibangun dengan pendekatan arsitektur
Modular Monolith (Next.js dan NestJS) untuk menangani lifecycle booking secara lengkap —
mulai dari discovery, pengecekan availability, reservation hold, pembayaran online,
e-ticket QR, check-in vendor, review, hingga settlement dan payout vendor.

## Problem

Booking wisata lokal masih didominasi cara manual (chat WhatsApp, catat di buku):
ketersediaan slot tidak transparan sehingga sering overselling saat ramai pemesan,
pembayaran tidak terverifikasi sistem (bukti transfer manual), tiket mudah dipalsukan
atau dipakai berulang, dan operator/vendor kesulitan mengelola jadwal, staff,
pendapatan, serta payout dalam satu tempat.

## Solution

Membangun marketplace terpadu: mesin availability menghitung kapasitas dari database
(accounting terkunci transaksi agar slot tidak pernah negatif), reservation hold 10 menit
dengan countdown, invoice pembayaran Mayar yang status suksesnya hanya diakui dari
webhook terverifikasi server, QR e-ticket berupa signed token sekali pakai, dan
workspace terpisah untuk customer, vendor owner, staff lapangan, dan admin —
semuanya beraudit dan terisolasi per vendor.

## Fitur-fitur Utama

- **Katalog Bandung**: 998 tempat dari snapshot lokal, pencarian nama/area/kategori,
  tempat tersimpan di browser, panduan kawasan, detail lokasi dan tautan peta.
  Harga asumsi scraper, jam buka tidak terverifikasi, serta foto stok tidak ditampilkan.
  Katalog tempat terpisah dari aktivitas mitra yang dapat dipesan.
- **Guest Checkout + Booking Aman**: tanpa wajib daftar (nama, email, WhatsApp);
  reservation terikat sesi browser, hold kedaluwarsa melepas kapasitas otomatis.
- **Anti-Overselling**: advisory lock + row lock PostgreSQL per slot; slot habis
  menolak dengan `SLOT_NOT_AVAILABLE`. Validasi tanggal lampau, slot lewat,
  cutoff per paket, blackout, dan min/max peserta — backend otoritatif.
- **Pembayaran Mayar Terverifikasi**: invoice via API, webhook dicek silang ke
  history server-side + status paid + nominal sama + idempoten; mode simulasi
  untuk demo tanpa uang asli (non-production saja).
- **QR E-Ticket Sekali Pakai**: signed token HMAC (bukan ID polos); scan ganda
  ditolak `TICKET_ALREADY_USED`; check-in memverifikasi signature, status,
  dan kepemilikan vendor.
- **Anti-Fake Booking**: rate limit, maks 3 unpaid per kontak, deteksi duplikat
  (tawarkan Lanjutkan Bayar / Batalkan), price preview dari backend.
- **Workspace per Role**: customer (My Trips, wishlist, review, profil), vendor
  (aktivitas, paket, jadwal, booking, check-in, revenue, payout, staff, promo,
  ulasan, profil, settings), staff lapangan (jadwal hari ini, scanner),
  admin (verifikasi vendor, listing, transaksi, refund, payout, CMS, risiko, audit).
- **Akun Aman**: verifikasi email wajib, ganti password memutus semua sesi,
  role otomatis saat onboarding/invite staff, audit log aksi kritis.
- **Keuangan Beraudit**: snapshot subtotal/diskon/fee/komisi per transaksi,
  split liabilitas refund vendor vs platform, payout berminimum + tak bisa
  melebihi saldo, status gagal yang reversibel.
- **Operasional Otomatis**: worker BullMQ (email, tandai terkirim) + sweeper
  rekonsiliasi tiap 60 detik untuk pembayaran/reservasi kedaluwarsa.

## Implementation

Dibangun sebagai monorepo Turborepo: Next.js (web storefront + dashboard),
NestJS modular monolith (API + OpenAPI), worker BullMQ.

- **Database Terintegrasi**: PostgreSQL + PostGIS (sumber kebenaran kapasitas,
  transaksi advisory-lock, full-text search, geospasial) dan Redis (TTL hold,
  rate limit, antrean).
- **Pembayaran**: Mayar (invoice API + webhook terverifikasi); token webhook
  `?key=` milik sendiri karena Mayar tidak memberi token.
- **Storage File**: Cloudinary (dokumen legalitas vendor) — cocok untuk deploy
  Vercel; database hanya menyimpan object key.
- **Notifikasi & Worker**: antrean BullMQ untuk email (konfirmasi booking,
  verifikasi akun) dan rekonsiliasi kedaluwarsa.
- **Keamanan**: JWT + refresh rotation, RBAC role+permission+ownership,
  throttle endpoint publik, validasi upload, log PII-safe, secret via env.
- **DevOps**: Dockerfile tiap app, `docker compose` (infra dev / full-stack
  via profile `apps`), GitHub Actions (typecheck → lint → test → build →
  docker build) tiap push/PR.

## Result

Alur kritis terverifikasi hidup: register + verifikasi email → availability →
reservation hold → booking transaksional → webhook idempoten → CONFIRMED +
tiket → QR check-in → tolak double-scan; duplikat unpaid ditawari lanjut/batal;
refund tercatat dengan split liabilitas; payout tak bisa melebihi saldo.
Validasi redesign: 42 tes API (termasuk integrasi PostgreSQL), 4 tes outbox worker,
3 tes import data, verifikasi rekonsiliasi dan HTTP. Typecheck, lint, serta build
web/API/worker lolos. Lihat [laporan implementasi](audit/2026-10-08-implementation.md)
untuk konfigurasi runtime, batas verifikasi, dan migrasi yang perlu diterapkan.

## Cara Menggunakan Aplikasi Web

### Jalan lokal (terminal)

```bash
npm install
docker compose up -d              # infra saja (postgres + redis)
npm run db:migrate
npm run db:seed                    # akun + data demo
npm run dev                        # web :3000 + api :4000
```

Butuh `apps/api/.env` (salin dari `.env.example`, isi `MAYAR_API_KEY` bila ada).

### Login ke Sistem

Buka `http://localhost:3000/auth/login`. Akun baru wajib verifikasi email
(link 24 jam, kirim ulang max 1/menit). Akun demo dari seed:

| Email | Password | Role |
|---|---|---|
| `candraagung877@gmail.com` | `admin12345` | Admin utama |
| `ops@tripora.id` | `admin12345` | Admin |
| `dimas@palayangan.id` | `vendor12345` | Vendor Owner |
| `salsa@palayangan.id` | `staff12345` | Vendor Staff |

(Ganti password admin setelah login pertama via Profil.)

### Booking sampai Check-in (demo tanpa uang asli)

1. Buka **Explore**, pilih aktivitas → paket → tanggal → slot → jumlah peserta.
2. **Checkout** sebagai guest (nama, email, WhatsApp) → slot ditahan 10 menit.
3. Di layar tunggu, klik **Simulasi bayar berhasil** (memakai jalur webhook asli).
4. E-ticket + QR terbit → buka `/booking/[kode]` → tunjukkan QR.
5. Login sebagai staff → **Scan tiket** → tempel token → CHECKED_IN.
   Scan ulang token sama ditolak `TICKET_ALREADY_USED`.

### Jadi Vendor

Daftar + verifikasi email → `/vendor/onboarding` (bisa diisi tanpa login,
akun diminta saat kirim; dokumen KTP/NIB diupload) → keluar-masuk lagi →
tunggu approve di `/admin/verification` → workspace `/vendor` terbuka.
Staff: daftar dulu, lalu owner invite emailnya di `/vendor/staff`.

### Deploy

- **Web (otomatis tiap push)**: import ke Vercel → Root Directory `apps/web` →
  env `NEXT_PUBLIC_API_URL` + `NEXT_PUBLIC_DEMO_PAYMENTS=false`.
- **API/worker (VPS)**: `docker compose --profile apps up -d --build`
  (migrasi jalan otomatis). Daftarkan webhook
  `POST https://api-domain-anda/api/v1/webhooks/mayar?key=TOKEN_ANDA`
  di dashboard Mayar. Detail: [DEPLOYMENT.md](DEPLOYMENT.md).

## Tech Stack

Next.js + React + TypeScript + Tailwind · NestJS + Prisma + PostgreSQL/PostGIS ·
Redis + BullMQ · Mayar · Cloudinary · Docker · GitHub Actions · Turborepo

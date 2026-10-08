# Implementasi redesign Tripora — 8 Oktober 2026

Implementasi lokal di workspace `queenfish`. Database utama dan file scraper sumber tidak diubah. Belum deploy atau commit.

## Yang berubah

| Area | Hasil |
| --- | --- |
| UI publik | Beranda editorial berbasis foto, navigasi desktop/mobile, katalog pencarian, kategori, kawasan, halaman tempat, panduan kawasan, dan tempat tersimpan di browser. |
| Data Bandung | 998 tempat diterima, 3 dikarantina, 971 URL foto Google. Harga asumsi, jam buka parsial, WhatsApp tebakan, foto stok, dan rating default disembunyikan. Sumber dan tanggal snapshot terlihat. |
| Aktivitas & checkout | Filter tanggal/peserta/harga, pagination, validasi slot, preview total dari server, penahanan slot, booking dibuat sekali, invoice bisa dicoba lagi, tautan pembayaran eksplisit, batas pembayaran terpisah dari waktu hold, dan status terminal. |
| Workspace | Sidebar tinta hijau, label halaman, panel/tabel seragam, navigasi mobile dengan Escape dan fokus keyboard, kesalahan query terlihat, status dan saldo diperjelas. |
| Auth | Query privat memakai sesi cookie; state/cache dibersihkan saat pergantian akun; logout yang masih berjalan ditunggu sebelum login berikutnya. Booking publik dengan sesi login tetap menyimpan pemiliknya. |
| Kapasitas | Tanggal kalender valid, relasi paket/jadwal dan hari aktif diverifikasi, peserta dijumlahkan, penahanan/konversi memakai transaksi dan lock, kedaluwarsa diperiksa ulang di dalam transaksi. |
| Pembayaran & tiket | Invoice tersimpan dipakai ulang; akses pembayaran memerlukan pemilik atau bukti guest; nominal dan isi webhook diperiksa tepat; event, status, tiket, notifikasi, dan audit satu transaksi. Pembayaran terlambat masuk review refund tanpa tiket/kuota baru. |
| Refund & payout | Persetujuan refund terpisah dari pencatatan transfer. Penolakan mengembalikan status asal. Payout mencadangkan baris earning tertentu, mengecualikan unpaid, dan bisa mencairkan saldo sisa refund parsial yang sah. Transfer perlu referensi. |
| Worker | Outbox tetap QUEUED bila adapter email belum tersedia; delivery memakai idempotency key. Rekonsiliasi memakai deadline pembayaran, menutup hold kadaluarsa, dan menyelesaikan trip setelah akhir slot termasuk lintas tengah malam. |
| CI | PostgreSQL/PostGIS test terisolasi, migrasi, tes integrasi API, worker, importer, dan rekonsiliasi ditambahkan ke workflow. Workflow belum dijalankan di GitHub dalam sesi ini. |

Data tempat menjadi katalog referensi, bukan otomatis vendor/aktivitas yang dapat dipesan. Area diperkirakan dari alamat. Skrip impor dapat diulang dan tidak menyentuh database:

```powershell
python scripts/import-bandung-places.py
python scripts/test-bandung-import.py
```

Sumber: `D:\Project\scrapper data\scrapper bandung\places.json`. Hash sumber sesudah implementasi sama dengan hasil audit. Snapshot hasil impor diperiksa identik dengan output normalisasi, termasuk 998 ID dan slug unik.

## Verifikasi

- `npm run typecheck`: lulus seluruh workspace.
- `npm run lint`: lulus seluruh workspace.
- `npm run build`: lulus web, API, worker, dan shared types; 66 halaman statis, detail dinamis sesuai route.
- API: **42/42** tes lulus; 14 tes integrasi memakai PostgreSQL nyata dan transaksi konkuren, 28 unit test lainnya.
- Worker: **4/4** tes lulus untuk kegagalan konfigurasi, retry, job konkuren, dan kegagalan jaringan. Transport email diganti stub; tidak mengirim email sungguhan.
- Importer: **3/3** tes lulus untuk data asumsi, outlier/duplikat, URL, dan rating.
- `node scripts/verify-reconciliation.cjs`: lulus deadline vs umur booking, expiry payment, akhir jadwal overnight, dan audit idempoten. Queue memakai stub.
- `node scripts/verify-redesign-http.cjs`: 15 halaman merender; filter/pagination/ID tersimpan benar; login cookie, owner booking, role guard, penolakan akses akun lain, bukti guest untuk invoice, serta kuota peserta diuji lewat API hidup.
- Route detail tidak dikenal menampilkan halaman tidak ditemukan dan `noindex`. Root loading boundary dapat membuat status respons streaming tetap 200, sesuai [kontrak streaming Next.js](https://nextjs.org/docs/app/api-reference/file-conventions/loading#status-codes).
- `docker compose config --quiet`: lulus.

Database verifikasi: `tripora_redesign_test_20261008` pada instance lokal port 5433, terpisah dari database utama. Semua 8 migrasi berhasil diterapkan di database ini. Fixture pembayaran memakai provider/stub test dan tidak melakukan transaksi nyata.

Preview lokal web di `http://localhost:3000`, API di port 4000 memakai database test tersebut. Katalog tempat memakai snapshot sumber; daftar aktivitas dan akun backend berisi fixture pengujian. Database test dipertahankan untuk preview. Gunakan konfigurasi database utama dan migrasi di bawah untuk runtime biasa.

Browser automation tidak tersedia (`chrome` dan `iab` ditolak sebagai browser tidak tersedia). Screenshot, rendering responsif, navigasi interaktif, scanner kamera, dan pengujian visual sesudah build **belum diverifikasi di browser**. Pemeriksaan struktur, CSS responsif, fokus, loading/error, build, dan HTTP sudah dilakukan; ini tidak menggantikan pemeriksaan visual.

## Menjalankan backend yang diperbarui

Migrasi baru ada di `apps/api/prisma/migrations/20261008000000_booking_lifecycle`. Sesuaikan `DATABASE_URL` untuk lingkungan yang akan dipakai, lalu:

```powershell
npm run db:generate
npm run db:deploy -w @tripora/api
npm run dev
```

Migrasi belum diterapkan ke database utama. Migrasi menambah expiry/URL payment, processed marker event, status asal refund, kaitan payout/earning, serta payload/dedupe notifikasi. PENDING payment lama mendapat batas 30 menit dari waktu booking. Payout lama yang tidak memiliki earning tercadangkan perlu digagalkan dan diminta ulang; histori saldo lama tidak otomatis dihitung ulang oleh migrasi.

Untuk mengulang tes integrasi, set `TEST_DATABASE_URL` ke database berisi kata `test`, terapkan migrasi di sana, kemudian:

```powershell
npm run test -w @tripora/api -- --runInBand
npm run test -w @tripora/worker
npm run build -w @tripora/worker
node scripts/verify-reconciliation.cjs
# Setelah API dan web hidup, dengan API memakai database test yang sama:
node scripts/verify-redesign-http.cjs
```

## Konfigurasi dan batas operasional

Mayar memerlukan credential dan webhook lingkungan yang benar; verifikasi transaksi nyata belum dilakukan. Pemeriksaan webhook kini membandingkan payload history terstruktur dengan event, transaction ID, nominal, dan status; rujukan [Mayar webhook history](https://docs.mayar.id/api-reference/webhook/history). Endpoint invoice v2 yang sudah dipakai proyek dipertahankan. Provider dapat sukses membuat invoice sebelum database gagal menyimpannya; celah crash ini tetap memerlukan dukungan idempotency/reconciliation dari provider.

Worker memerlukan `EMAIL_DELIVERY_URL` dan opsional `EMAIL_DELIVERY_TOKEN` pada proses worker. Compose meneruskan variabel tersebut. Adapter menerima POST `{to, subject, text}` dengan header `Idempotency-Key`; adapter harus menghormati key itu untuk retry setelah crash. Tanpa adapter, notifikasi tetap antre dan tidak ditandai terkirim. Set URL/token melalui environment worker untuk menjalankan lokal.

Refund dan payout saat ini **mencatat transfer yang telah berhasil dilakukan**, bukan mengeksekusi transfer bank otomatis. Histori nominal/earning yang telah tercipta sebelum perbaikan perlu rekonsiliasi terpisah. Pencarian aktivitas mengecek availability sebelum pagination dengan query per kandidat; untuk katalog mitra besar perlu optimasi query dan benchmark.

Foto sumber dapat berhenti tersedia; komponen menampilkan placeholder saat gagal. Keakuratan venue, jam/harga terkini, kepemilikan nomor WhatsApp, dan hak penggunaan foto belum diverifikasi mandiri.

Skill yang digunakan: UI/UX Pro Max, Anti AI Slop, Impeccable, Caveman. Thesis visual dan token ada di `design-system/MASTER.md`. Konfigurasi CI mengikuti [dokumentasi service PostgreSQL GitHub Actions](https://docs.github.com/en/actions/tutorials/use-containerized-services/create-postgresql-service-containers).

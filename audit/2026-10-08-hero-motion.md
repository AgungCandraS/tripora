# Hero foto dan GSAP — 8 Oktober 2026

Permintaan: mengganti hero beranda menjadi latar foto penuh yang berganti otomatis, menambahkan teks mengetik, dan menerapkan GSAP motion pada website.

## Implementasi

- `HomeHero` menggantikan hero dua kolom. Tinggi minimum satu viewport (`100svh`), foto menutup seluruh section, overlay menjaga keterbacaan teks dan navigasi.
- Tiga foto: Situ Cileunca, Orchid Forest Cikole, dan Glamping Legok Kondang. Seluruh foto disalin dari URL foto dalam snapshot katalog Bandung ke aset lokal; hero tidak meminta foto langsung ke Google saat dibuka. Foto AI awal sudah diganti sesuai permintaan pengguna.
- GSAP 3.15.0, `@gsap/react` 2.1.2, TextPlugin, dan ScrollTrigger. Pergantian otomatis setiap delapan detik; crossfade 1,25 detik, zoom ringan, pengetikan 1,65 detik. Baris judul memiliki tinggi cadangan.
- Header transparan di atas foto dan menjadi solid setelah scroll 60px atau ketika menu mobile dibuka.
- Kontrol foto sebelumnya/berikutnya, pilihan langsung, dan jeda. Fokus di dalam hero, tab tersembunyi, serta hero di luar viewport menjeda animasi. Foto yang dipilih manual ketika dijeda langsung ditampilkan. Tombol lanjutkan secara eksplisit mengizinkan animasi berjalan lagi.
- Reduced motion menampilkan teks utuh dan mematikan rotasi otomatis, zoom, dan reveal. Pilihan foto manual tetap tersedia. Teks mengetik dekoratif tersembunyi dari pembaca layar; judul lengkap tetap ada.
- `SiteMotion` memberi reveal saat scroll pada pengantar section, kartu katalog, pilihan suasana, banner booking, kartu area, serta judul dan metrik workspace. Hasil query yang datang belakangan terdaftar melalui observer. Trigger milik elemen yang dihapus dibersihkan; seluruh context direvert pada pergantian route/preferensi dan unmount.
- Animasi Framer Motion pada shell dan metrik workspace diganti dengan GSAP. Animasi lokal Framer Motion pada komponen lain tetap ada; tidak diterapkan dua animator pada elemen yang sama.
- Form pencarian hero tetap mengirim query ke `/explore`; link foto mengarah ke area atau detail tempat yang bersangkutan. Konten dan foto pertama tersedia pada HTML server tanpa JavaScript.

## Sumber foto tambahan

- Revisi foto awal: aset AI Pangalengan diganti foto Situ Cileunca dari field `photo` tempat `situ-cileunca-pangalengan-bandung-57a28588`. Aset lokal `public/images/hero-situ-cileunca.jpg`, 514.626 byte; sumber diminta pada `w1920-h1080-k-no`. Foto diunduh sebagai JPEG dan diperiksa. Label serta tautan hero mengikuti Situ Cileunca.

- Orchid Forest: tempat `orchid-forest-cikole-c033edde`, field `photo` di `apps/web/data/places.json`; ukuran permintaan dinaikkan ke `w1600-h1200-k-no`. Aset `public/images/hero-orchid-forest.jpg`, 519.936 byte.
- Legok Kondang: tempat `glamping-legok-kondang-lodge-2d6542f0`, field `photo` pada snapshot yang sama; ukuran permintaan `w1600-h1200-k-no`. Aset `public/images/hero-ciwidey.jpg`, 1.878.029 byte.
- Kedua file berhasil diunduh sebagai JPEG dan diperiksa secara visual. Foto Lakeside Rancabali tidak dipakai karena sumber merespons HTTP 403.

## Validasi

- `npm run typecheck -w @tripora/web`, `npm run lint -w @tripora/web`, dan build produksi web lolos. Build menghasilkan 66 halaman statis beserta route dinamis.
- HTTP smoke lolos untuk 10 route: beranda, explore dengan query/area, saved, destinations, dua detail tempat pada hero, account, vendor, admin. Markup hero server berisi tiga lapisan foto, judul lengkap, kontrol jeda, dan form pencarian.
- Tiga aset asli serta endpoint optimasi Next Image merespons 200 dengan tipe image. Hasil WebP pada lebar permintaan 1920: Pangalengan 89.918 byte, Orchid Forest 285.436 byte, Ciwidey 207.060 byte.
- Filter katalog Pangalengan melalui `/api/places` mengembalikan data dan seluruh hasil sesuai area. Tidak ada perubahan backend pada pekerjaan motion ini.
- Preview produksi tersedia di `http://localhost:3000`; API tetap memakai database pengujian yang disiapkan pada implementasi sebelumnya.

Pemeriksaan visual browser dan interaksi animasi belum dapat dijalankan: inventory browser kosong; `cua.createBrowserTab("iab", ...)` mengembalikan `Browser is not available: iab`. Pemeriksaan gambar sumber bukan pemeriksaan layout atau animasi browser.

## Persiapan publikasi

Sesuai revisi pengguna, tombol jeda dan panah sebelumnya/berikutnya dihapus. Pilihan foto melalui indikator tetap tersedia. Penjedaan saat fokus, tab tersembunyi, dan hero di luar layar serta reduced motion tetap berjalan. Copy beranda, katalog, dan ringkasan dashboard diperjelas untuk pengguna akhir.

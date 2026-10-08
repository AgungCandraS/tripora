# Tripora — Bandung, dekat dan jelas

Identitas tetap Tripora. Foto tempat menjadi pusat pengalaman; tinta hijau, kertas hangat, dan aksen terakota memberi karakter lokal tanpa ilustrasi generik. Judul memakai serif editorial, navigasi dan data memakai sans yang mudah dibaca. Hero foto berganti dengan indikator pilihan sesuai permintaan pengguna; hindari statistik palsu, harga scraper, testimoni buatan, dan istilah backend di antarmuka pelanggan.

## Sistem

- Kertas #f6f7f2, permukaan putih, tinta #10231e, hijau #27483c, terakota #b95134. Aksen coral terang untuk dekorasi, warna gelap untuk teks.
- Konten maksimum 1320px; jarak 4/8/12/16/24/32/48/64px. Radius 12px untuk kontrol, 20px untuk foto utama. Hindari setiap blok menjadi kartu.
- Judul utama responsif 40–76px; badan minimum 16px untuk alur publik. Label tabel 13–14px. Angka keuangan tabular.
- Semua kontrol utama setidaknya 44px. Fokus terlihat, label eksplisit, navigasi keyboard, tautan lompat konten, status dengan teks.
- Animasi interaksi 150–220ms. Hormati reduced motion. Sediakan loading, kosong, gagal dengan retry, serta status booking terminal.
- Shell workspace: sidebar tinta hijau, header dengan nama halaman, panel putih, tabel yang bisa digulir. Informasi dan tindakan utama didahulukan.

## Kontrak konten

Tempat referensi memakai sumber dan tanggal snapshot; tidak mengaku partner atau dapat dipesan. Harga, jam buka, WhatsApp tebakan, serta rating default disembunyikan. Aktivitas berbayar hanya tampil jika vendor disetujui, listing terbit, paket aktif. Total pembayaran berasal dari backend. Refund disetujui berbeda dari dana sudah dikembalikan; payout memerlukan referensi transfer nyata.

UI/UX Pro Max dipakai untuk aksesibilitas dan perilaku kontrol. Dua hasil pencarian design-system tidak cocok dengan produk; palet dan tipografi itu tidak diadopsi. Anti-AI-Slop dipakai untuk thesis dan konten nyata; Impeccable untuk pemolesan serta pemeriksaan kondisi tepi.

## Motion hero dan halaman

- Hero memenuhi viewport dengan tiga foto lokal, transisi silang GSAP 1,25 detik dan pergantian setiap 8 detik. Teks mengetik memakai TextPlugin; tinggi baris dicadangkan agar pencarian tidak bergeser.
- Indikator pilihan foto dapat diakses keyboard. Tombol jeda dan panah dihapus sesuai revisi pengguna. Fokus di hero, tab tersembunyi, dan hero di luar layar menjeda animasi.
- Reduced motion menonaktifkan pengetikan, zoom, pergantian otomatis, dan reveal scroll; foto tetap dapat dipilih manual. Judul pembaca layar tetap utuh.
- ScrollTrigger memberi reveal singkat pada pengantar, kartu tempat, pilihan suasana, banner, serta judul dan metrik workspace. Cleanup per route dan preferensi; konten tetap tersedia dalam HTML tanpa JavaScript.

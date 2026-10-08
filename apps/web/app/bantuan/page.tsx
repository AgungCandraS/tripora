import Link from "next/link";
import { SiteFooter, SiteHeader } from "../components/site-header";

const STEPS = [
  {
    t: "Temukan aktivitas",
    d: "Buka halaman Aktivitas & tiket untuk mencari pengalaman yang dapat dipesan. Katalog Jelajahi tempat membantu Anda menemukan lokasi wisata, kafe, dan kuliner.",
  },
  {
    t: "Pilih paket dan jadwal",
    d: "Periksa informasi aktivitas, lokasi pertemuan, paket, tanggal, dan jumlah peserta. Pilih jadwal yang masih tersedia.",
  },
  {
    t: "Lengkapi data pemesan",
    d: "Isi nama, email, dan nomor telepon yang dapat dihubungi. Anda dapat memesan tanpa membuat akun. Periksa rincian serta total pembayaran sebelum melanjutkan.",
  },
  {
    t: "Selesaikan pembayaran",
    d: "Ikuti instruksi pada halaman pembayaran dan selesaikan sebelum batas waktu berakhir. Ketersediaan jadwal dapat berubah jika batas waktu pemesanan terlewati.",
  },
  {
    t: "Simpan tiket",
    d: "Tiket tersedia setelah pembayaran dikonfirmasi. Buka Pesanan saya menggunakan kode pemesanan serta email atau nomor telepon pemesan untuk melihat status dan tiket.",
  },
  {
    t: "Tunjukkan tiket di lokasi",
    d: "Datang sesuai jadwal dan lokasi pertemuan. Tunjukkan kode QR tiket kepada petugas untuk check-in. Tiket yang sudah digunakan tidak dapat digunakan kembali.",
  },
  {
    t: "Bagikan pengalaman",
    d: "Setelah aktivitas selesai, Anda dapat memberikan ulasan melalui detail pemesanan. Ulasan membantu wisatawan lain memilih pengalaman yang sesuai.",
  },
];

export default function BantuanPage() {
  return (
    <main className="bg-paper text-ink">
      <SiteHeader />
      <section
        id="content"
        className="mx-auto max-w-[860px] px-5 pb-24 pt-14 sm:pt-20"
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-coral-dark">
          Bantuan · Tripora
        </p>
        <h1 className="display-text mt-2 text-3xl font-bold tracking-[-0.045em] sm:text-5xl">
          Panduan pemesanan dan perjalanan.
        </h1>
        <p className="mt-4 max-w-[640px] text-sm leading-6 text-ink/60">
          Pelajari cara memilih aktivitas, menyelesaikan pembayaran, dan
          menggunakan tiket. Untuk memeriksa pemesanan Anda, buka{" "}
          <Link
            href="/my-trips"
            className="font-bold text-coral-dark underline underline-offset-4"
          >
            Pesanan saya
          </Link>
          dengan kode pemesanan dan kontak yang digunakan saat memesan.
        </p>

        <ol className="mt-10 space-y-3">
          {STEPS.map((s, i) => (
            <li
              key={s.t}
              className="rounded-[14px] border border-line bg-paper p-5 sm:p-6"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-coral-dark">
                Langkah {i + 1}
              </p>
              <h2 className="mt-1.5 text-lg font-bold">{s.t}</h2>
              <p className="mt-2 text-sm leading-6 text-ink/60">{s.d}</p>
            </li>
          ))}
        </ol>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-[14px] bg-ink p-6 text-paper">
            <h2 className="font-bold">Pantau status pemesanan</h2>
            <p className="mt-2 text-sm leading-6 text-paper/80">
              Halaman detail pemesanan menampilkan status pembayaran, tiket,
              jadwal aktivitas, serta pembatalan atau pengembalian dana bila
              ada.
            </p>
          </div>
          <div className="rounded-[14px] border border-line p-6">
            <h2 className="font-bold">Pembatalan dan pengembalian dana</h2>
            <p className="mt-2 text-sm leading-6 text-ink/60">
              Ketentuan mengikuti kebijakan yang berlaku saat pemesanan Anda.
              Periksa detail pemesanan sebelum mengajukan pembatalan.
              Persetujuan pengembalian dana dan penyelesaian transfer
              ditampilkan terpisah.
            </p>
            <Link
              href="/kebijakan-refund"
              className="mt-3 inline-block text-sm font-bold text-coral-dark underline underline-offset-4"
            >
              Baca kebijakan refund lengkap
            </Link>
          </div>
        </div>

        <div className="mt-8 rounded-[14px] border border-line p-6">
          <h2 className="font-bold">Bantuan dan kemitraan</h2>
          <ul className="mt-2 space-y-1.5 text-sm text-ink/60">
            <li>
              Bantuan pemesanan:{" "}
              <a
                href="mailto:halo@tripora.id"
                className="font-bold text-coral-dark underline underline-offset-4"
              >
                halo@tripora.id
              </a>
            </li>
            <li>
              Kemitraan:{" "}
              <a
                href="mailto:partner@tripora.id"
                className="font-bold text-coral-dark underline underline-offset-4"
              >
                partner@tripora.id
              </a>{" "}
              atau{" "}
              <Link
                href="/vendor/onboarding"
                className="font-bold text-coral-dark underline underline-offset-4"
              >
                pendaftaran mitra
              </Link>
            </li>
          </ul>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

import Link from "next/link";
import { SiteFooter, SiteHeader } from "../components/site-header";

const STEPS = [
  { t: "Pilih aktivitas & paket", d: "Buka Explore, filter destinasi / kategori / tanggal. Setiap activity punya banyak package (mis. ATV Short 30 mnt Rp100rb, Adventure 60 mnt Rp175rb)." },
  { t: "Pilih tanggal, slot & peserta", d: "Availability = capacity − confirmed − active reservations. Kalau habis, backend balas SLOT_NOT_AVAILABLE — pilih slot lain." },
  { t: "Reservation hold 10 menit", d: "Slot ditahan sementara di server (Redis TTL + validasi PostgreSQL). Timer tampil di checkout. Kedaluwarsa = EXPIRED, kapasitas dilepas." },
  { t: "Guest checkout", d: "Tanpa wajib daftar. Wajib isi: nama lengkap, email, nomor WhatsApp (08…). Nama peserta lain opsional." },
  { t: "Bayar via Mayar", d: "Booking dibuat PENDING_PAYMENT, lalu kamu diarahkan ke payment link Mayar (QRIS / VA / Kartu). Voucher cth. PAGI10 divalidasi backend." },
  { t: "Konfirmasi otomatis", d: "Sukses hanya dari webhook Mayar terverifikasi server-to-server (idempoten). Bukan dari redirect browser. Status jadi CONFIRMED + e-ticket terbit." },
  { t: "QR e-ticket & check-in", d: "QR berisi signed ticket token (raw.signature HMAC), bukan booking ID polos. Satu tiket satu scan — scan ganda balas TICKET_ALREADY_USED." },
  { t: "Selesai & review", d: "Setelah COMPLETED kamu bisa memberi rating 1–5 + cerita. Review terverifikasi dari booking asli." },
];

export default function BantuanPage() {
  return (
    <main className="bg-paper text-ink">
      <SiteHeader />
      <section className="mx-auto max-w-[860px] px-5 pb-24 pt-14 sm:pt-20">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-coral-dark">Bantuan · Tripora</p>
        <h1 className="display-text mt-2 text-3xl font-bold tracking-[-0.045em] sm:text-5xl">Cara booking sampai check-in.</h1>
        <p className="mt-4 max-w-[640px] text-sm leading-6 text-ink/60">
          Satu-satunya halaman bantuan publik. Alur di bawah sama persis dengan yang dijalankan backend
          (PRD §5, §10–§15). Butuh lacak booking? Buka <Link href="/my-trips" className="font-bold text-coral-dark underline underline-offset-4">My Trips</Link> dengan kode <code className="rounded bg-soft px-1.5 py-0.5 font-mono text-xs font-bold">TRP-</code> + email pemesan.
        </p>

        <ol className="mt-10 space-y-3">
          {STEPS.map((s, i) => (
            <li key={s.t} className="rounded-[14px] border border-line bg-paper p-5 sm:p-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-coral-dark">Langkah {i + 1}</p>
              <h2 className="mt-1.5 text-lg font-bold">{s.t}</h2>
              <p className="mt-2 text-sm leading-6 text-ink/60">{s.d}</p>
            </li>
          ))}
        </ol>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-[14px] bg-ink p-6 text-paper">
            <h2 className="font-bold">Status booking</h2>
            <p className="mt-2 font-mono text-xs leading-6 text-paper/65">
              PENDING_PAYMENT → PAID → CONFIRMED → CHECKED_IN → COMPLETED
              <br />CANCEL_REQUESTED · CANCELLED · EXPIRED · REFUND_PENDING · REFUNDED · NO_SHOW
            </p>
          </div>
          <div className="rounded-[14px] border border-line p-6">
            <h2 className="font-bold">Kebijakan refund vendor</h2>
            <p className="mt-2 text-sm leading-6 text-ink/60">
              &gt;7 hari: 100% · 3–7 hari: 50% · &lt;3 hari: non-refundable. Pengajuan via email dengan kode booking.
            </p>
            <Link href="/kebijakan-refund" className="mt-3 inline-block text-sm font-bold text-coral-dark underline underline-offset-4">
              Baca kebijakan refund lengkap
            </Link>
          </div>
        </div>

        <div className="mt-8 rounded-[14px] border border-line p-6">
          <h2 className="font-bold">Hubungi manusia</h2>
          <ul className="mt-2 space-y-1.5 text-sm text-ink/60">
            <li>Customer: <a href="mailto:halo@tripora.id" className="font-bold text-coral-dark underline underline-offset-4">halo@tripora.id</a></li>
            <li>Jadi vendor: <a href="mailto:partner@tripora.id" className="font-bold text-coral-dark underline underline-offset-4">partner@tripora.id</a> atau <Link href="/vendor/onboarding" className="font-bold text-coral-dark underline underline-offset-4">onboarding vendor</Link></li>
          </ul>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

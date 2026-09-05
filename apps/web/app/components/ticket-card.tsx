"use client";

import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";
import { MapPin, QrCode } from "@phosphor-icons/react";

export function TicketCard({
  code,
  activity,
  pkg,
  slot,
  date,
  name,
  vendor,
  meetingPoint,
  status = "CONFIRMED",
  token,
}: {
  code: string;
  activity: string;
  pkg: string;
  slot: string;
  date: string;
  name: string;
  vendor: string;
  meetingPoint: string;
  status?: string;
  token?: string | null;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden rounded-[16px] border border-line bg-paper"
    >
      <div className="flex items-center justify-between gap-4 bg-ink px-5 py-4 text-paper">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-coral">
            E-ticket · {status}
          </p>
          <p className="mt-1 font-mono text-sm font-bold tracking-wider">{code}</p>
        </div>
        <div className="rounded-[10px] bg-paper p-2">
          {token ? (
            <QRCodeSVG value={token} size={72} aria-label={`QR tiket ${code}`} />
          ) : (
            <QrCode size={40} weight="duotone" className="text-ink" aria-hidden="true" />
          )}
        </div>
      </div>
      <div className="p-5">
        <h3 className="text-lg font-bold tracking-[-0.02em]">{activity}</h3>
        <p className="mt-1 text-sm text-ink/55">
          {pkg} · {date} · {slot}
        </p>
        <dl className="mt-4 space-y-2 border-t border-dashed border-line pt-4 text-sm">
          {[
            ["Pemesan", name],
            ["Vendor", vendor],
            ["Meeting point", meetingPoint],
          ].map(([k, v]) => (
            <div key={k} className="flex items-start justify-between gap-3">
              <dt className="flex items-center gap-1.5 text-ink/50">
                {k === "Meeting point" && <MapPin size={13} weight="fill" />}
                {k}
              </dt>
              <dd className="text-right font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 rounded-[10px] bg-soft px-3.5 py-2.5 text-[11px] leading-5 text-ink/55">
          QR berisi signed ticket token — bukan booking ID polos. Satu tiket satu
          scan. Tunjukkan layar ini saat check-in.
        </p>
      </div>
    </motion.div>
  );
}

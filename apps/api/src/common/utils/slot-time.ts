import { BadRequestException } from "@nestjs/common";

/**
 * Destination-aware slot timing (PRD §20-23, BUSINESS_RULES.md).
 * DB stores date as UTC-midnight + start_time "HH:MM" in destination wall-clock.
 * MVP destinations are Asia/Jakarta; map is extendable (no DST in Indonesia).
 */
export const TZ_OFFSETS_MINUTES: Record<string, number> = {
  "Asia/Jakarta": 7 * 60,
  "Asia/Makassar": 8 * 60,
  "Asia/Jayapura": 9 * 60,
};

export function tzOffsetMinutes(timezone: string): number {
  return TZ_OFFSETS_MINUTES[timezone] ?? TZ_OFFSETS_MINUTES["Asia/Jakarta"];
}

/** Milliseconds of `date` (UTC midnight) at wall-clock "HH:MM" in tz, returned as UTC epoch. */
export function slotStartUtc(date: Date, startTime: string, timezone = "Asia/Jakarta"): number {
  const [h, m] = startTime.split(":").map(Number);
  const dayStart = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return dayStart + (h * 60 + m - tzOffsetMinutes(timezone)) * 60 * 1000;
}

/** YYYY-MM-DD of now in tz. */
export function todayIsoInTz(now: number, timezone = "Asia/Jakarta"): string {
  const d = new Date(now + tzOffsetMinutes(timezone) * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

/**
 * Authoritative slot timing validation. Throws:
 * BOOKING_DATE_IN_PAST / SLOT_IN_PAST / BOOKING_CUTOFF_REACHED.
 */
export function validateSlotTiming(args: {
  date: Date;
  startTime: string;
  cutoffMinutes: number;
  timezone?: string;
  now?: number;
}): { slotStart: number } {
  const { date, startTime, cutoffMinutes, timezone = "Asia/Jakarta", now = Date.now() } = args;
  const dateIso = date.toISOString().slice(0, 10);
  if (dateIso < todayIsoInTz(now, timezone)) {
    throw new BadRequestException({ code: "BOOKING_DATE_IN_PAST", message: "Booking date is in the past." });
  }
  const slotStart = slotStartUtc(date, startTime, timezone);
  if (slotStart <= now) {
    throw new BadRequestException({ code: "SLOT_IN_PAST", message: "This slot has already started." });
  }
  if (now >= slotStart - cutoffMinutes * 60 * 1000) {
    throw new BadRequestException({ code: "BOOKING_CUTOFF_REACHED", message: "Booking cutoff for this slot has passed." });
  }
  return { slotStart };
}

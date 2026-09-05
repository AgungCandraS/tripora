import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { slotStartUtc, todayIsoInTz } from "../../common/utils/slot-time";

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * available = capacity − confirmed_booked − active_reservations
   * Postgres is source of truth. Redis hold cache is an optimization, not the source of truth.
   * CLOSED overrides (blackout) force available=0. Past/cutoff slots are flagged
   * (backend still rejects them authoritatively at reservation/booking time).
   */
  async getAvailability(packageId: string, date: Date) {
    const packageRow = await this.prisma.package.findUnique({
      where: { id: packageId },
      include: { activity: { include: { destination: true } } },
    });
    if (!packageRow) return { packageId, date: date.toISOString().slice(0, 10), slots: [] };
    const timezone = packageRow.activity.destination?.timezone ?? "Asia/Jakarta";
    const cutoffMinutes = packageRow.booking_cutoff_minutes ?? 120;
    const now = Date.now();

    const scheduled = await this.prisma.schedule.findMany({
      where: { package_id: packageId, status: "ACTIVE" },
      orderBy: { start_time: "asc" },
    });

    const dayOfWeek = date.getUTCDay();
    const dateStart = new Date(date);
    dateStart.setUTCHours(0, 0, 0, 0);
    const dateEnd = new Date(dateStart);
    dateEnd.setUTCDate(dateEnd.getUTCDate() + 1);
    const dateIso = dateStart.toISOString().slice(0, 10);
    const isPastDate = dateIso < todayIsoInTz(now, timezone);

    const slots = [];
    for (const schedule of scheduled) {
      const applicable =
        (schedule.specific_date && schedule.specific_date.getTime() === dateStart.getTime()) ||
        (!schedule.specific_date && schedule.day_of_week === dayOfWeek);
      if (!applicable) continue;

      const override = await this.prisma.scheduleOverride.findFirst({
        where: { schedule_id: schedule.id, date: dateStart, status: { in: ["ACTIVE", "CLOSED"] } },
      });
      const blackout = override?.status === "CLOSED";
      const capacity = blackout ? 0 : (override?.capacity_override ?? schedule.capacity);

      const confirmed = await this.prisma.booking.count({
        where: {
          schedule_id: schedule.id,
          booking_date: dateStart,
          status: { in: ["PENDING_PAYMENT", "PAID", "CONFIRMED", "CHECKED_IN"] },
        },
      });

      const activeRes = await this.prisma.reservation.count({
        where: {
          schedule_id: schedule.id,
          date: dateStart,
          status: "ACTIVE",
          expires_at: { gt: new Date() },
        },
      });

      const slotStart = slotStartUtc(dateStart, schedule.start_time, timezone);
      const inPast = isPastDate || slotStart <= now;
      const cutoffReached = !inPast && now >= slotStart - cutoffMinutes * 60 * 1000;
      const available = blackout || inPast || cutoffReached ? 0 : Math.max(0, capacity - confirmed - activeRes);
      slots.push({
        scheduleId: schedule.id,
        slot: schedule.start_time,
        capacity,
        confirmedBooked: confirmed,
        activeReservations: activeRes,
        available,
        soldOut: available <= 0,
        blackout,
        past: inPast,
        cutoffReached,
      });
    }
    return { packageId, date: dateIso, slots };
  }

  /** Effective capacity (schedule capacity after override). CLOSED override → 0. */
  async effectiveCapacity(scheduleId: string, date: Date): Promise<number> {
    const schedule = await this.prisma.schedule.findUniqueOrThrow({ where: { id: scheduleId } });
    const dateStart = new Date(date);
    dateStart.setUTCHours(0, 0, 0, 0);
    const override = await this.prisma.scheduleOverride.findFirst({
      where: { schedule_id: scheduleId, date: dateStart, status: { in: ["ACTIVE", "CLOSED"] } },
    });
    if (override?.status === "CLOSED") return 0;
    return override?.capacity_override ?? schedule.capacity;
  }

  /** Full slot guard context: schedule + package + timezone + blackout flag. */
  async slotGuard(scheduleId: string, date: Date) {
    const schedule = await this.prisma.schedule.findUniqueOrThrow({
      where: { id: scheduleId },
      include: { package: { include: { activity: { include: { destination: true } } } } },
    });
    const dateStart = new Date(date);
    dateStart.setUTCHours(0, 0, 0, 0);
    const override = await this.prisma.scheduleOverride.findFirst({
      where: { schedule_id: scheduleId, date: dateStart, status: { in: ["ACTIVE", "CLOSED"] } },
    });
    const blackout = override?.status === "CLOSED";
    return {
      schedule,
      package: schedule.package,
      timezone: schedule.package.activity.destination?.timezone ?? "Asia/Jakarta",
      blackout,
      capacity: blackout ? 0 : (override?.capacity_override ?? schedule.capacity),
    };
  }
}

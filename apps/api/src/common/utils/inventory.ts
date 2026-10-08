import { Prisma } from "@prisma/client";

export const CAPACITY_STATUSES = [
  "PENDING_PAYMENT",
  "PAID",
  "CONFIRMED",
  "CHECKED_IN",
  "COMPLETED",
  "REFUND_PENDING",
  "CANCEL_REQUESTED",
] as const;

export async function lockSlot(
  tx: Prisma.TransactionClient,
  scheduleId: string,
  date: Date,
) {
  const key = `${scheduleId}:${date.toISOString().slice(0, 10)}`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
  await tx.$queryRaw`SELECT id FROM schedules WHERE id = ${scheduleId}::uuid FOR UPDATE`;
}

export async function allocation(
  tx: Prisma.TransactionClient,
  scheduleId: string,
  date: Date,
  excludeReservationId?: string,
) {
  const [bookings, reservations] = await Promise.all([
    tx.booking.aggregate({
      where: {
        schedule_id: scheduleId,
        booking_date: date,
        OR: [
          {
            status: {
              in: CAPACITY_STATUSES.filter(
                (status) => status !== "REFUND_PENDING",
              ),
            },
          },
          {
            status: "REFUND_PENDING",
            ticket: { is: { status: { in: ["ISSUED", "USED"] } } },
          },
        ],
      },
      _sum: { participant_count: true },
    }),
    tx.reservation.aggregate({
      where: {
        schedule_id: scheduleId,
        date,
        status: "ACTIVE",
        expires_at: { gt: new Date() },
        ...(excludeReservationId ? { NOT: { id: excludeReservationId } } : {}),
      },
      _sum: { participants: true },
    }),
  ]);
  return {
    booked: bookings._sum.participant_count ?? 0,
    held: reservations._sum.participants ?? 0,
  };
}

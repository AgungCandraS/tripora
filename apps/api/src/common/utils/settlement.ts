import type { Prisma } from "@prisma/client";

/** Completed services and retained cancellation fees can settle. Late payments have no ticket. */
export const settlementEligibleBooking: Prisma.BookingWhereInput = {
  OR: [
    { status: "COMPLETED", payment: { status: "PAID" } },
    {
      status: "REFUNDED",
      payment: { status: "REFUNDED" },
      ticket: { isNot: null },
    },
  ],
};

import { createHmac, timingSafeEqual } from "crypto";

/** Opaque capability issued only after booking creation or verified guest lookup. */
export function bookingAccessToken(bookingId: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`booking-access:v1:${bookingId}`)
    .digest("hex");
}

export function hasBookingAccess(
  bookingId: string,
  token: unknown,
  secret: string,
): boolean {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) return false;
  return timingSafeEqual(
    Buffer.from(token, "hex"),
    Buffer.from(bookingAccessToken(bookingId, secret), "hex"),
  );
}

import { SetMetadata } from "@nestjs/common";

/**
 * Granular vendor-staff permissions (PRD §9):
 * booking.read, booking.confirm, calendar.read, checkin.scan, participant.read,
 * activity.read, activity.edit, promotion.read, review.read, revenue.read.
 * VENDOR_OWNER melewati semua cek (full access); ADMIN juga lolos.
 */
export const PERMISSIONS_KEY = "permissions";

export const STAFF_PERMISSIONS = [
  "booking.read",
  "booking.confirm",
  "calendar.read",
  "checkin.scan",
  "participant.read",
  "activity.read",
  "activity.edit",
  "promotion.read",
  "review.read",
  "revenue.read",
] as const;

export type StaffPermission = (typeof STAFF_PERMISSIONS)[number];

/** Default staff lapangan: tanpa revenue (PRD §9). */
export const DEFAULT_STAFF_PERMISSIONS: StaffPermission[] = [
  "booking.read",
  "calendar.read",
  "checkin.scan",
  "participant.read",
  "activity.read",
  "promotion.read",
  "review.read",
];

export const Permissions = (...permissions: StaffPermission[]) => SetMetadata(PERMISSIONS_KEY, permissions);

/** Pure helper (unit-testable): semua required harus ada di granted. */
export function hasPermissions(granted: string[], required: readonly string[]): boolean {
  return required.every((p) => granted.includes(p));
}

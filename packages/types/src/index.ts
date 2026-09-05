export const BookingStatus = [
  "PENDING_PAYMENT",
  "PAID",
  "CONFIRMED",
  "CHECKED_IN",
  "COMPLETED",
  "CANCEL_REQUESTED",
  "CANCELLED",
  "EXPIRED",
  "REFUND_PENDING",
  "REFUNDED",
  "NO_SHOW",
] as const;

export type BookingStatusType = (typeof BookingStatus)[number];

export const ReservationStatus = ["ACTIVE", "CONVERTED", "EXPIRED", "CANCELLED"] as const;
export type ReservationStatusType = (typeof ReservationStatus)[number];

export const VendorStatus = ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"] as const;
export type VendorStatusType = (typeof VendorStatus)[number];

export const ActivityStatus = ["DRAFT", "IN_REVIEW", "PUBLISHED", "SUSPENDED", "REJECTED"] as const;
export type ActivityStatusType = (typeof ActivityStatus)[number];

export const TicketStatus = ["ISSUED", "USED", "VOID"] as const;
export type TicketStatusType = (typeof TicketStatus)[number];

export const PaymentStatus = ["PENDING", "PAID", "FAILED", "EXPIRED", "REFUNDED"] as const;
export type PaymentStatusType = (typeof PaymentStatus)[number];

export const RoleCode = ["GUEST", "CUSTOMER", "VENDOR_OWNER", "VENDOR_STAFF", "ADMIN"] as const;
export type RoleCodeType = (typeof RoleCode)[number];

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

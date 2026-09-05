import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { randomBytes } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { normalizeEmail, normalizePhone } from "../../common/utils/contact";
import { validateSlotTiming } from "../../common/utils/slot-time";
import { AuditService } from "../audit/audit.service";
import { AvailabilityService } from "../availability/availability.service";
import { PromotionsService } from "../promotions/promotions.service";
import { SettingsService } from "../settings/settings.service";
import { TicketsService } from "../tickets/tickets.service";
import { CreateBookingDto } from "./dto/create-booking.dto";

const PLATFORM_FEE_DEFAULT = 5000;

/** Default vendor cancellation policy snapshot (PRD §53): >7d 100% · 3–7d 50% · <3d 0%. */
const DEFAULT_CANCELLATION_POLICY = {
  greater_than_7_days_percent: 100,
  three_to_seven_days_percent: 50,
  less_than_3_days_percent: 0,
};

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly availability: AvailabilityService,
    private readonly promotions: PromotionsService,
    private readonly settings: SettingsService,
    private readonly tickets: TicketsService,
    private readonly audit: AuditService
  ) {}

  private platformFee(): Promise<number> {
    return this.settings.getNumber("PLATFORM_FEE", PLATFORM_FEE_DEFAULT);
  }

  /**
   * Overselling prevention (PRD §29):
   * BEGIN -> lock slot row -> verify remaining capacity -> create booking + financial snapshot -> update confirmed allocation -> COMMIT
   */
  async create(dto: CreateBookingDto, userId: string | null) {
    const email = normalizeEmail(dto.booker.email);
    const phone = normalizePhone(dto.booker.phone);

    const reservation = await this.prisma.reservation.findUnique({ where: { id: dto.reservationId } });
    if (!reservation) throw new NotFoundException({ code: "NOT_FOUND", message: "Reservation not found" });
    if (reservation.status !== "ACTIVE") {
      throw new BadRequestException({ code: "RESERVATION_EXPIRED", message: "Reservation is no longer active" });
    }
    if (reservation.expires_at < new Date()) {
      throw new BadRequestException({ code: "RESERVATION_EXPIRED", message: "Reservation hold expired" });
    }
    // Reservation belongs to current session/guest (PRD §37).
    if (reservation.customer_session_id && reservation.customer_session_id !== (dto.sessionId ?? null)) {
      throw new ForbiddenException({ code: "FORBIDDEN", message: "Reservation belongs to another session" });
    }

    // Re-validate slot rules at booking time: cutoff may pass while holding (PRD §37).
    const guard = await this.availability.slotGuard(reservation.schedule_id, reservation.date);
    if (guard.blackout) {
      throw new BadRequestException({ code: "SLOT_NOT_AVAILABLE", message: "Selected date is closed for this slot." });
    }
    validateSlotTiming({
      date: reservation.date,
      startTime: guard.schedule.start_time,
      cutoffMinutes: guard.package.booking_cutoff_minutes ?? 120,
      timezone: guard.timezone,
    });
    if (reservation.participants < guard.package.min_participants || reservation.participants > guard.package.max_participants) {
      throw new BadRequestException({ code: "INVALID_QUANTITY", message: "Participant count violates package rules." });
    }

    // Duplicate unpaid detection (PRD §33): same contact + package + date + slot + quantity.
    const duplicate = await this.prisma.booking.findFirst({
      where: {
        package_id: reservation.package_id,
        schedule_id: reservation.schedule_id,
        booking_date: reservation.date,
        participant_count: reservation.participants,
        status: "PENDING_PAYMENT",
        OR: [{ booker_email: email }, { booker_phone: phone }],
      },
      select: { booking_code: true },
    });
    if (duplicate) {
      throw new BadRequestException({
        code: "DUPLICATE_BOOKING_DETECTED",
        message: `You already have unpaid booking ${duplicate.booking_code}. Continue its payment or cancel it first.`,
      });
    }

    // Anti-fake-booking velocity cap (PRD §32).
    const maxUnpaid = this.config.get<number>("MAX_ACTIVE_UNPAID_PER_CONTACT", 3);
    const unpaidCount = await this.prisma.booking.count({
      where: { status: "PENDING_PAYMENT", OR: [{ booker_email: email }, { booker_phone: phone }] },
    });
    if (unpaidCount >= maxUnpaid) {
      throw new BadRequestException({ code: "TOO_MANY_ACTIVE_BOOKINGS", message: "Too many unpaid bookings. Complete or cancel one first." });
    }

    return this.prisma.$transaction(async (tx) => {
      // Per-slot serialization: advisory lock on (schedule, date) so concurrent
      // bookings for the SAME slot queue here; different slots don't block each other.
      // Released automatically at COMMIT/ROLLBACK.
      const slotKey = `${reservation.schedule_id}:${reservation.date.toISOString().slice(0, 10)}`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${slotKey}))`;

      // Row-level lock on the reservation row.
      const [locked] = await tx.$queryRaw<
        { id: string; schedule_id: string; package_id: string; participants: number; status: string; date: Date; booking_date: Date }[]
      >`SELECT id, schedule_id, package_id, participants, status, date, date as booking_date FROM reservations WHERE id = ${reservation.id}::uuid FOR UPDATE`;

      if (!locked) throw new BadRequestException({ code: "RESERVATION_EXPIRED", message: "Reservation no longer exists" });
      if (locked.status !== "ACTIVE") {
        throw new BadRequestException({ code: "RESERVATION_EXPIRED", message: "Reservation is no longer active" });
      }

      // Effective capacity (schedule or override). CLOSED override was rejected above.
      const [cap] = await tx.$queryRaw<{ capacity: number }[]>`
        SELECT COALESCE(o.capacity_override, s.capacity) AS capacity
        FROM schedules s
        LEFT JOIN schedule_overrides o ON o.schedule_id = s.id AND o.date = (${locked.date})::date AND o.status = 'ACTIVE'
        WHERE s.id = ${locked.schedule_id}::uuid
      `;
      const capacity = cap?.capacity ?? 0;

      const confirmed = await tx.booking.count({
        where: { schedule_id: locked.schedule_id, booking_date: locked.date, status: { in: ["PENDING_PAYMENT", "PAID", "CONFIRMED", "CHECKED_IN"] } },
      });
      const activeRes = await tx.reservation.count({
        where: { schedule_id: locked.schedule_id, date: locked.date, status: "ACTIVE", expires_at: { gt: new Date() }, NOT: { id: locked.id } },
      });
      const available = capacity - confirmed - activeRes;
      if (locked.participants > available) {
        throw new BadRequestException({ code: "SLOT_NOT_AVAILABLE", message: "Selected slot is no longer available." });
      }

      const packageRow = await tx.package.findUniqueOrThrow({ where: { id: locked.package_id }, include: { activity: true } });
      const vendor = await tx.vendor.findUniqueOrThrow({ where: { id: packageRow.activity.vendor_id } });

      // Promotion (optional) is validated by PromotionsService to compute discount.
      const discount = dto.promotionCode
        ? await this.promotions.validateSync(dto.promotionCode, locked.participants * packageRow.base_price, dto.reservationId, tx)
        : 0;

      const subtotal = packageRow.base_price * locked.participants;
      const platformFee = await this.platformFee();
      const totalAmount = subtotal - discount + platformFee;
      const commissionRate = vendor.commission_rate_default.toNumber();
      const commissionAmount = Math.round(subtotal * commissionRate);
      const vendorNet = totalAmount - commissionAmount;
      const bookingCode = this.genCode();

      const booking = await tx.booking.create({
        data: {
          booking_code: bookingCode,
          user_id: userId,
          vendor_id: vendor.id,
          activity_id: packageRow.activity_id,
          package_id: packageRow.id,
          schedule_id: locked.schedule_id,
          reservation_id: locked.id,
          booking_date: locked.date,
          slot_start: (await tx.schedule.findUniqueOrThrow({ where: { id: locked.schedule_id } })).start_time,
          participant_count: locked.participants,
          status: "PENDING_PAYMENT",
          subtotal,
          discount_amount: discount,
          platform_fee: platformFee,
          total_amount: totalAmount,
          commission_rate_snapshot: new Prisma.Decimal(commissionRate),
          commission_amount: commissionAmount,
          vendor_net_amount: vendorNet,
          cancellation_policy_snapshot: DEFAULT_CANCELLATION_POLICY as unknown as Prisma.InputJsonValue,
          booker_name: dto.booker.name,
          booker_email: email,
          booker_phone: phone,
          participants: { create: dto.participants?.map((p) => ({ name: p.name, age: p.age, emergency_contact: p.emergency_contact, special_requirements: p.special_requirements })) },
        },
        include: { participants: true },
      });

      // Mark reservation CONVERTED (atomic within the same transaction).
      await tx.reservation.update({ where: { id: locked.id }, data: { status: "CONVERTED" } });

      // PENDING payment row (provider invoice attached later via POST /payments).
      await tx.payment.create({
        data: { booking_id: booking.id, provider: this.config.get<string>("PAYMENT_PROVIDER", "mayar"), amount: totalAmount, status: "PENDING" },
      });

      // Vendor earning record.
      await tx.vendorEarning.create({
        data: { vendor_id: vendor.id, booking_id: booking.id, gross_amount: totalAmount, commission_amount: commissionAmount, net_amount: vendorNet },
      });

      await this.audit.log({ actorUserId: userId, action: "CREATE", resourceType: "Booking", resourceId: booking.id });

      return {
        booking_code: booking.booking_code,
        id: booking.id,
        status: "PENDING_PAYMENT",
        total_amount: totalAmount,
        subtotal,
        discount_amount: discount,
        platform_fee: platformFee,
        commission_amount: commissionAmount,
        vendor_net_amount: vendorNet,
      };
    });
  }

  /** Server-side price preview, no side effects (PRD §35). */
  async pricePreview(input: { packageId: string; scheduleId: string; date: string; participants: number; promotionCode?: string | null }) {
    const date = new Date(`${input.date}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) throw new BadRequestException({ code: "VALIDATION_ERROR", message: "Invalid date" });
    const guard = await this.availability.slotGuard(input.scheduleId, date);
    if (guard.schedule.package_id !== input.packageId) {
      throw new BadRequestException({ code: "VALIDATION_ERROR", message: "Schedule does not belong to package." });
    }
    if (guard.package.status !== "ACTIVE") throw new NotFoundException({ code: "NOT_FOUND", message: "Package not found" });
    if (guard.blackout) {
      throw new BadRequestException({ code: "SLOT_NOT_AVAILABLE", message: "Selected date is closed for this slot." });
    }
    validateSlotTiming({ date, startTime: guard.schedule.start_time, cutoffMinutes: guard.package.booking_cutoff_minutes ?? 120, timezone: guard.timezone });
    if (input.participants < guard.package.min_participants || input.participants > guard.package.max_participants) {
      throw new BadRequestException({ code: "INVALID_QUANTITY", message: "Participant count violates package rules." });
    }
    const subtotal = guard.package.base_price * input.participants;
    const discount = input.promotionCode ? await this.promotions.previewDiscount(input.promotionCode, subtotal) : 0;
    const platformFee = await this.platformFee();
    return { subtotal, discount_amount: discount, platform_fee: platformFee, total_amount: subtotal - discount + platformFee };
  }

  /** Explicit guest/owner cancel command for unpaid bookings (PRD §67, §105). */
  async cancel(code: string, emailOrPhone: string) {
    const booking = await this.prisma.booking.findUnique({ where: { booking_code: code } });
    if (!booking) throw new NotFoundException({ code: "NOT_FOUND", message: "Booking not found" });
    const contact = emailOrPhone.includes("@") ? normalizeEmail(emailOrPhone) : normalizePhone(emailOrPhone);
    const match =
      booking.booker_email === contact ||
      booking.booker_email.toLowerCase() === contact ||
      booking.booker_phone === contact;
    if (!match) throw new BadRequestException({ code: "FORBIDDEN", message: "Credentials mismatch" });
    if (booking.status !== "PENDING_PAYMENT") {
      throw new BadRequestException({ code: "INVALID_STATE_TRANSITION", message: "Only unpaid bookings can be cancelled here" });
    }
    const updated = await this.prisma.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } });
    await this.prisma.payment.updateMany({ where: { booking_id: booking.id, status: "PENDING" }, data: { status: "EXPIRED" } });
    await this.audit.log({ action: "UPDATE", resourceType: "Booking", resourceId: booking.id, metadata: { transition: "PENDING_PAYMENT->CANCELLED" } });
    return { booking_code: updated.booking_code, status: updated.status };
  }

  async getByCode(code: string, user?: { id: string; roles: string[]; vendorId?: string }) {
    const booking = await this.prisma.booking.findUnique({
      where: { booking_code: code },
      include: { participants: true, payment: true, ticket: true, activity: true, package: true, schedule: true },
    });
    if (!booking) throw new NotFoundException({ code: "NOT_FOUND", message: "Booking not found" });
    if (user) {
      const isAdmin = user.roles.includes("ADMIN");
      const isOwner = booking.user_id !== null && booking.user_id === user.id;
      const isVendor = user.vendorId !== undefined && booking.vendor_id === user.vendorId;
      if (!isAdmin && !isOwner && !isVendor) {
        throw new ForbiddenException({ code: "FORBIDDEN", message: "Not your booking" });
      }
    }
    return booking;
  }

  /** Guest lookup by booking code + email/phone. Includes ticket token (credential = ownership proof). */
  async lookup(code: string, emailOrPhone: string) {
    const booking = await this.prisma.booking.findUnique({ where: { booking_code: code } });
    if (!booking) throw new NotFoundException({ code: "NOT_FOUND", message: "Booking not found" });
    const contact = emailOrPhone.includes("@") ? normalizeEmail(emailOrPhone) : normalizePhone(emailOrPhone);
    const match =
      booking.booker_email === contact ||
      booking.booker_email.toLowerCase() === contact ||
      booking.booker_phone === contact;
    if (!match) throw new BadRequestException({ code: "FORBIDDEN", message: "Credentials mismatch" });
    const full = await this.getByCode(code);
    const ticketToken = full.ticket ? await this.tickets.getPublicToken(full.id) : null;
    return { ...full, ticketToken };
  }

  private genCode(): string {
    const d = new Date();
    const stamp = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    const rand = Array.from({ length: 5 }, () => chars[randomBytes(1)[0] % chars.length]).join("");
    return `TRP-${stamp}-${rand}`;
  }
}

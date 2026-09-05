import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { validateSlotTiming } from "../../common/utils/slot-time";
import { AvailabilityService } from "../availability/availability.service";
import { SettingsService } from "../settings/settings.service";
import { CreateReservationDto } from "./dto/create-reservation.dto";

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
    private readonly config: ConfigService,
    private readonly settings: SettingsService
  ) {}

  /**
   * Create a temporary reservation hold. Postgres is validated first (source of truth);
   * Redis may cache the hold TTL but capacity decisions always depend on Postgres rows.
   */
  async create(dto: CreateReservationDto) {
    const date = new Date(`${dto.date}T00:00:00Z`);
    const guard = await this.availability.slotGuard(dto.scheduleId, date);
    const packageRow = guard.package;
    if (packageRow.status !== "ACTIVE") throw new NotFoundException({ code: "NOT_FOUND", message: "Package not found" });
    if (guard.schedule.package_id !== packageRow.id) {
      throw new BadRequestException({ code: "VALIDATION_ERROR", message: "Schedule does not belong to package." });
    }
    if (guard.blackout) {
      throw new BadRequestException({ code: "SLOT_NOT_AVAILABLE", message: "Selected date is closed for this slot." });
    }
    // Authoritative timing: past date / past slot / cutoff (PRD §20-23).
    validateSlotTiming({ date, startTime: guard.schedule.start_time, cutoffMinutes: packageRow.booking_cutoff_minutes ?? 120, timezone: guard.timezone });
    // Quantity vs package rules (PRD §24).
    if (dto.participants < packageRow.min_participants || dto.participants > packageRow.max_participants) {
      throw new BadRequestException({
        code: "INVALID_QUANTITY",
        message: `Participants must be between ${packageRow.min_participants} and ${packageRow.max_participants} for this package.`,
      });
    }

    const capacity = guard.capacity;
    const confirmed = await this.prisma.booking.count({
      where: { schedule_id: dto.scheduleId, booking_date: date, status: { in: ["PENDING_PAYMENT", "PAID", "CONFIRMED", "CHECKED_IN"] } },
    });
    const activeRes = await this.prisma.reservation.count({
      where: { schedule_id: dto.scheduleId, date, status: "ACTIVE", expires_at: { gt: new Date() } },
    });
    const available = capacity - confirmed - activeRes;
    if (dto.participants > available) {
      throw new BadRequestException({
        code: "SLOT_NOT_AVAILABLE",
        message: "Selected slot is no longer available.",
      });
    }

    const holdMinutes = await this.settings.getNumber("RESERVATION_HOLD_MINUTES", this.config.get<number>("RESERVATION_HOLD_MINUTES", 10));
    const expiresAt = new Date(Date.now() + holdMinutes * 60 * 1000);

    const reservation = await this.prisma.reservation.create({
      data: {
        public_token: randomUUID(),
        package_id: dto.packageId,
        schedule_id: dto.scheduleId,
        date,
        participants: dto.participants,
        customer_session_id: dto.sessionId ?? null,
        status: "ACTIVE",
        expires_at: expiresAt,
      },
    });

    return {
      reservationId: reservation.id,
      publicToken: reservation.public_token,
      expiresAt: expiresAt,
      pricingPreview: {
        basePrice: packageRow.base_price,
        subtotal: packageRow.base_price * dto.participants,
        participants: dto.participants,
      },
    };
  }
}

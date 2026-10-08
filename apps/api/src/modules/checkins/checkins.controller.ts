import {
  BadRequestException,
  Controller,
  Post,
  Body,
  Get,
  Query,
} from "@nestjs/common";
import { ForbiddenException } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/auth.decorators";
import { Permissions } from "../../common/decorators/permission.decorators";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { TicketsService } from "../tickets/tickets.service";

@ApiTags("checkins")
@ApiBearerAuth()
@Roles("VENDOR_OWNER", "VENDOR_STAFF", "ADMIN")
@Controller("vendor/checkins")
export class CheckinsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tickets: TicketsService,
    private readonly audit: AuditService,
  ) {}

  @Post("scan")
  @Permissions("checkin.scan")
  async scan(@Body() body: { token: string }, @CurrentUser() user: AuthUser) {
    // 1. Verify signature + ticket status
    const ticket = await this.tickets.validate(body.token);
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM bookings WHERE id = ${ticket.booking_id}::uuid FOR UPDATE`;
      const booking = await tx.booking.findUniqueOrThrow({
        where: { id: ticket.booking_id },
      });
      if (
        !user.roles.includes("ADMIN") &&
        (!user.vendorId || booking.vendor_id !== user.vendorId)
      )
        throw new ForbiddenException({
          code: "FORBIDDEN",
          message: "Not your booking",
        });
      const current = await tx.ticket.findUniqueOrThrow({
        where: { id: ticket.id },
      });
      if (current.status !== "ISSUED")
        throw new BadRequestException({
          code: "TICKET_ALREADY_USED",
          message: "Ticket is no longer available",
        });
      if (!["PAID", "CONFIRMED"].includes(booking.status))
        throw new BadRequestException({
          code: "INVALID_STATE_TRANSITION",
          message: "Booking not ready for check-in",
        });
      const checkin = await tx.checkin.create({
        data: {
          ticket_id: ticket.id,
          booking_id: booking.id,
          vendor_id: booking.vendor_id,
          staff_user_id: user.id,
        },
      });
      await tx.ticket.update({
        where: { id: ticket.id },
        data: { status: "USED", used_at: new Date() },
      });
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: "CHECKED_IN" },
      });
      await tx.auditLog.create({
        data: {
          actor_user_id: user.id,
          action: "UPDATE",
          resource_type: "Checkin",
          resource_id: checkin.id,
        },
      });
      return {
        checkinId: checkin.id,
        bookingCode: booking.booking_code,
        status: "CHECKED_IN",
      };
    });
  }

  @Get()
  @Permissions("booking.read")
  async listForVendor(
    @CurrentUser() user: AuthUser,
    @Query("limit") limit?: string,
  ) {
    const bookings = await this.prisma.booking.findMany({
      where: {
        vendor_id: user.roles.includes("ADMIN")
          ? undefined
          : (user.vendorId ?? "00000000-0000-0000-0000-000000000000"),
      },
      orderBy: { created_at: "desc" },
      take: Math.min(Number(limit) || 50, 500),
      include: { ticket: true, checkins: true, participants: true },
    });
    return { bookings };
  }
}

import { BadRequestException, Controller, Post, Body, Get, Query } from "@nestjs/common";
import { ForbiddenException } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/auth.decorators";
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
    private readonly audit: AuditService
  ) {}

  @Post("scan")
  async scan(@Body() body: { token: string }, @CurrentUser() user: AuthUser) {
    // 1. Verify signature + ticket status
    const ticket = await this.tickets.validate(body.token);
    // 2. Idempotency: already checked in?
    const existing = await this.prisma.checkin.findUnique({ where: { ticket_id: ticket.id } });
    if (existing) {
      throw new BadRequestException({ code: "TICKET_ALREADY_USED", message: "Ticket already used" });
    }

    const booking = await this.prisma.booking.findUniqueOrThrow({ where: { id: ticket.booking_id } });
    // 3. Vendor ownership isolation
    if (user.vendorId && booking.vendor_id !== user.vendorId) {
      throw new ForbiddenException({ code: "FORBIDDEN", message: "Cannot check in another vendor's booking" });
    }
    // 4. Booking status must be CONFIRMED (or PAID)
    if (!["PAID", "CONFIRMED"].includes(booking.status)) {
      throw new BadRequestException({ code: "INVALID_STATE_TRANSITION", message: "Booking not ready for check-in" });
    }

    // Idempotent upsert via unique ticket_id
    const checkin = await this.prisma.checkin.create({
      data: { ticket_id: ticket.id, booking_id: booking.id, vendor_id: booking.vendor_id, staff_user_id: user.id },
    }).catch((e) => {
      if (e?.code === "P2002") throw new BadRequestException({ code: "TICKET_ALREADY_USED", message: "Ticket already used" });
      throw e;
    });

    await this.prisma.ticket.update({ where: { id: ticket.id }, data: { status: "USED", used_at: new Date() } });
    await this.prisma.booking.update({ where: { id: booking.id }, data: { status: "CHECKED_IN" } });
    await this.audit.log({ actorUserId: user.id, action: "UPDATE", resourceType: "Checkin", resourceId: checkin.id });

    return { checkinId: checkin.id, bookingCode: booking.booking_code, status: "CHECKED_IN" };
  }

  @Get()
  async listForVendor(@CurrentUser() user: AuthUser, @Query("limit") limit?: string) {
    const bookings = await this.prisma.booking.findMany({
      where: { vendor_id: user.vendorId ?? undefined },
      orderBy: { created_at: "desc" },
      take: Math.min(Number(limit) || 50, 500),
      include: { ticket: true, checkins: true, participants: true },
    });
    return { bookings };
  }
}

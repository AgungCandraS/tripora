import { Controller, Get, Param } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { PrismaService } from "../../prisma/prisma.service";
import { TicketsService } from "./tickets.service";

@ApiTags("tickets")
@ApiBearerAuth()
@Controller("tickets")
export class TicketsController {
  constructor(private readonly tickets: TicketsService, private readonly prisma: PrismaService) {}

  /** QR payload for the booking owner, its vendor, or admin. */
  @Get("booking/:bookingId")
  async forBooking(@Param("bookingId") bookingId: string, @CurrentUser() user: AuthUser) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException({ code: "NOT_FOUND", message: "Booking not found" });
    const isAdmin = user.roles.includes("ADMIN");
    const isOwner = booking.user_id !== null && booking.user_id === user.id;
    const isVendor = user.vendorId !== undefined && booking.vendor_id === user.vendorId;
    if (!isAdmin && !isOwner && !isVendor) {
      throw new ForbiddenException({ code: "FORBIDDEN", message: "Not your ticket" });
    }
    const token = await this.tickets.getPublicToken(bookingId);
    const ticket = await this.prisma.ticket.findUnique({ where: { booking_id: bookingId } });
    return { token, status: ticket?.status ?? null, bookingCode: booking.booking_code };
  }
}

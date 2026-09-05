import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * QR ticket uses an opaque signed token (payload.signature) — never the raw booking ID.
 * Token = randomId.signature ; server stores token_hash (HMAC over the full token) so the
 * raw token is never persisted. The full signed token is what the QR displays.
 */
@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  private signature(input: string): string {
    return createHmac("sha256", this.config.get<string>("JWT_ACCESS_SECRET", "ticketing-secret"))
      .update(input)
      .digest("hex");
  }

  private hash(token: string): string {
    return createHmac("sha256", this.config.get<string>("JWT_ACCESS_SECRET", "ticketing-hash"))
      .update(token)
      .digest("hex");
  }

  async issueForBooking(bookingId: string) {
    const existing = await this.prisma.ticket.findUnique({ where: { booking_id: bookingId } });
    if (existing) return existing;

    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException({ code: "NOT_FOUND", message: "Booking not found" });

    const raw = `trp-${booking.booking_code.toLowerCase()}-${bookingId.replace(/-/g, "").slice(0, 8)}`;
    const signedToken = `${raw}.${this.signature(raw)}`;
    const tokenHash = this.hash(signedToken);

    return this.prisma.ticket.create({
      data: { booking_id: bookingId, token_hash: tokenHash, status: "ISSUED" },
    });
  }

  /** Returns the full signed token for QR display (deterministic, verifiable). */
  async getPublicToken(bookingId: string): Promise<string> {
    const ticket = await this.prisma.ticket.findUnique({ where: { booking_id: bookingId } });
    if (!ticket) throw new NotFoundException({ code: "NOT_FOUND", message: "Ticket not found" });
    const booking = await this.prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    const raw = `trp-${booking.booking_code.toLowerCase()}-${bookingId.replace(/-/g, "").slice(0, 8)}`;
    return `${raw}.${this.signature(raw)}`;
  }

  /** Verify signature + ticket exists + status rules. Returns ticket. */
  async validate(token: string) {
    const dot = token.lastIndexOf(".");
    const raw = token.slice(0, dot);
    const signature = token.slice(dot + 1);
    if (!raw || !signature || this.signature(raw) !== signature) {
      throw new BadRequestException({ code: "TICKET_INVALID", message: "Invalid ticket signature" });
    }
    const ticket = await this.prisma.ticket.findUnique({ where: { token_hash: this.hash(token) } });
    if (!ticket) throw new BadRequestException({ code: "TICKET_INVALID", message: "Ticket not found" });
    if (ticket.status === "USED") throw new BadRequestException({ code: "TICKET_ALREADY_USED", message: "Ticket already used" });
    return ticket;
  }
}

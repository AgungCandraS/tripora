import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { TicketsService } from "../tickets/tickets.service";
import { NotificationsProducer } from "../notifications/notifications-producer.service";
import { MayarProvider } from "./mayar.provider";
import { SettingsService } from "../settings/settings.service";
import { PaymentGatewayProvider } from "./payment-gateway.interface";

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly settings: SettingsService,
    private readonly mayar: MayarProvider,
    private readonly tickets: TicketsService,
    private readonly notifications: NotificationsProducer,
    private readonly audit: AuditService
  ) {}

  /** Gateway tunggal: Mayar per PRD §41. Abstraksi provider dipertahankan untuk masa depan. */
  private provider(): PaymentGatewayProvider {
    return this.mayar;
  }

  private providerForEvent(_rawPayload: unknown): PaymentGatewayProvider {
    return this.mayar;
  }

  async find(id: string) {
    const payment = await this.prisma.payment.findUniqueOrThrow({ where: { id } });
    return payment;
  }

  /**
   * Portfolio/demo helper: simulate a verified provider payment WITHOUT real money.
   * NEVER available in production. Requires MAYAR_SKIP_WEBHOOK_VERIFY=true.
   * Reuses the real webhook path (idempotency, audit, ticket, notification).
   */
  async simulate(bookingCode: string) {
    if (this.config.get<string>("NODE_ENV", "development") === "production") {
      throw new BadRequestException({ code: "FORBIDDEN", message: "Simulation is disabled in production" });
    }
    if (this.config.get<string>("MAYAR_SKIP_WEBHOOK_VERIFY", "false") !== "true") {
      throw new BadRequestException({ code: "FORBIDDEN", message: "Set MAYAR_SKIP_WEBHOOK_VERIFY=true to simulate payments" });
    }
    const booking = await this.prisma.booking.findUnique({
      where: { booking_code: bookingCode },
      include: { payment: true },
    });
    if (!booking || !booking.payment) throw new NotFoundException({ code: "NOT_FOUND", message: "Payable booking not found" });
    if (booking.status !== "PENDING_PAYMENT" || booking.payment.status !== "PENDING") {
      throw new BadRequestException({ code: "INVALID_STATE_TRANSITION", message: "Booking is not payable" });
    }
    const { randomUUID } = await import("crypto");
    return this.handleWebhook({
      event: "payment.received",
      data: {
        id: randomUUID(),
        transactionId: booking.payment.provider_reference ?? booking.id,
        amount: booking.payment.amount,
        status: "SUCCESS",
        transactionStatus: "paid",
      },
    });
  }

  async create(bookingCode: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { booking_code: bookingCode },
      include: { payment: true, activity: true },
    });
    if (!booking) throw new NotFoundException({ code: "NOT_FOUND", message: "Booking not found" });
    if (booking.status !== "PENDING_PAYMENT") {
      throw new BadRequestException({ code: "INVALID_STATE_TRANSITION", message: "Booking is not payable" });
    }

    const pg = this.provider();
    const created = await pg.createPayment({
      bookingId: booking.id,
      bookingCode: booking.booking_code,
      customerName: booking.booker_name,
      customerEmail: booking.booker_email,
      customerPhone: booking.booker_phone,
      amount: booking.total_amount,
      description: `${booking.activity.title} · ${booking.booking_code}`,
      expiryMinutes: await this.settings.getNumber("PAYMENT_EXPIRY_MINUTES", this.config.get<number>("PAYMENT_EXPIRY_MINUTES", 30)),
    });

    const payment = booking.payment
      ? await this.prisma.payment.update({
          where: { id: booking.payment.id },
          data: { status: "PENDING", provider: created.provider, provider_reference: created.providerReference },
        })
      : await this.prisma.payment.create({
          data: { booking_id: booking.id, provider: created.provider, provider_reference: created.providerReference, amount: booking.total_amount, status: "PENDING" },
        });

    return { paymentId: payment.id, paymentUrl: created.paymentUrl, expiresAt: created.expiresAt };
  }

  /**
   * Provider-agnostic idempotent webhook. Sequence per PAYMENT_FLOW.md:
   * verify signature → verify order → verify amount → persist raw event →
   * idempotency → explicit state transition → side effects once.
   */
  async handleWebhook(rawPayload: unknown) {
    const pg = this.providerForEvent(rawPayload);
    const normalized = await pg.verifyAndNormalizeWebhook(rawPayload as never);
    const { providerEventId, eventType, providerReference, amount, status } = normalized;

    const payment = await this.prisma.payment.findFirst({
      where: { provider_reference: providerReference ?? undefined },
      include: { booking: true },
    });
    if (!payment) throw new NotFoundException({ code: "NOT_FOUND", message: "Payment not found" });

    // Amount verification: never confirm when provider amount differs (PRD §43, §110).
    if (typeof amount === "number" && Number.isFinite(amount) && amount !== payment.amount) {
      await this.audit.log({
        action: "WEBHOOK",
        resourceType: "Payment",
        resourceId: payment.id,
        metadata: { reason: "AMOUNT_MISMATCH", providerEventId, expected: payment.amount, received: amount },
      });
      throw new BadRequestException({ code: "PAYMENT_AMOUNT_MISMATCH", message: "Provider amount does not match booking total" });
    }

    // Idempotency: if this event already stored, return current state (no double processing).
    const existingEvent = await this.prisma.paymentEvent.findUnique({ where: { provider_event_id: providerEventId } });
    if (existingEvent) {
      return { idempotent: true, payment: { id: payment.id, status: payment.status } };
    }

    const event = await this.prisma.paymentEvent
      .create({
        data: {
          payment_id: payment.id,
          provider_event_id: providerEventId,
          event_type: eventType,
          raw_payload: rawPayload as object,
        },
      })
      .catch(async (e) => {
        // Race: another webhook inserted it concurrently -> idempotent.
        if (e?.code === "P2002") {
          const found = await this.prisma.paymentEvent.findUnique({ where: { provider_event_id: providerEventId } });
          if (found) return found;
        }
        throw e;
      });

    if (status === "PAID" && payment.booking.status === "PENDING_PAYMENT") {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: "PAID", paid_at: new Date() },
      });
      await this.prisma.booking.update({
        where: { id: payment.booking_id },
        data: { status: "CONFIRMED" },
      });
      await this.tickets.issueForBooking(payment.booking_id);
      await this.notifications.enqueueBookingConfirmed(payment.booking_id);
      await this.audit.log({ action: "WEBHOOK", resourceType: "Payment", resourceId: payment.id, metadata: { providerEventId, amount } });
    } else if (status === "FAILED" && ["PENDING_PAYMENT", "PAID"].includes(payment.booking.status)) {
      // Terminal provider failure/expiry: booking EXPIRED releases capacity (PRD §44).
      await this.prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
      if (payment.booking.status === "PENDING_PAYMENT") {
        await this.prisma.booking.update({ where: { id: payment.booking_id }, data: { status: "EXPIRED" } });
      }
      await this.audit.log({ action: "WEBHOOK", resourceType: "Payment", resourceId: payment.id, metadata: { reason: "PAYMENT_FAILED", providerEventId, eventType } });
    }
    // PENDING / REFUNDED / already-transitioned: event persisted, no state change.

    void event;
    const fresh = await this.prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    return { idempotent: false, payment: { id: fresh.id, status: fresh.status } };
  }
}

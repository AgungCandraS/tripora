import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { hasBookingAccess } from "../../common/utils/booking-access";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
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
    private readonly audit: AuditService,
  ) {}

  /** Gateway tunggal: Mayar per PRD §41. Abstraksi provider dipertahankan untuk masa depan. */
  private provider(): PaymentGatewayProvider {
    return this.mayar;
  }

  private providerForEvent(_rawPayload: unknown): PaymentGatewayProvider {
    return this.mayar;
  }

  async find(id: string, user: AuthUser) {
    const payment = await this.prisma.payment.findUniqueOrThrow({
      where: { id },
      include: { booking: true },
    });
    if (payment.booking.user_id !== user.id && !user.roles.includes("ADMIN"))
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "Not your payment",
      });
    return payment;
  }

  /**
   * Portfolio/demo helper: simulate a verified provider payment WITHOUT real money.
   * NEVER available in production. Requires MAYAR_SKIP_WEBHOOK_VERIFY=true.
   * Reuses the real webhook path (idempotency, audit, ticket, notification).
   */
  async simulate(bookingCode: string, token?: string) {
    if (this.config.get<string>("NODE_ENV", "development") === "production") {
      throw new BadRequestException({
        code: "FORBIDDEN",
        message: "Simulation is disabled in production",
      });
    }
    if (
      this.config.get<string>("MAYAR_SKIP_WEBHOOK_VERIFY", "false") !== "true"
    ) {
      throw new BadRequestException({
        code: "FORBIDDEN",
        message: "Set MAYAR_SKIP_WEBHOOK_VERIFY=true to simulate payments",
      });
    }
    const booking = await this.prisma.booking.findUnique({
      where: { booking_code: bookingCode },
      include: { payment: true },
    });
    if (!booking || !booking.payment)
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "Payable booking not found",
      });
    if (
      booking.status !== "PENDING_PAYMENT" ||
      booking.payment.status !== "PENDING"
    ) {
      throw new BadRequestException({
        code: "INVALID_STATE_TRANSITION",
        message: "Booking is not payable",
      });
    }
    this.assertAccess(booking, undefined, token);
    const { randomUUID } = await import("crypto");
    if (!booking.payment.provider_reference)
      await this.prisma.payment.update({
        where: { id: booking.payment.id },
        data: { provider_reference: booking.id },
      });
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

  private assertAccess(
    booking: { id: string; user_id: string | null },
    userId?: string,
    token?: string,
  ) {
    if (userId && booking.user_id === userId) return;
    if (
      !hasBookingAccess(
        booking.id,
        token,
        this.config.get<string>("JWT_ACCESS_SECRET", "ticketing-secret"),
      )
    ) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "Verify booking ownership before paying",
      });
    }
  }

  async create(bookingCode: string, userId?: string, token?: string) {
    const found = await this.prisma.booking.findUnique({
      where: { booking_code: bookingCode },
    });
    if (!found)
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "Booking not found",
      });
    this.assertAccess(found, userId, token);
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM bookings WHERE id = ${found.id}::uuid FOR UPDATE`;
        const booking = await tx.booking.findUniqueOrThrow({
          where: { id: found.id },
          include: { payment: true, activity: true },
        });
        const deadline = booking.payment?.expires_at;
        if (
          booking.status !== "PENDING_PAYMENT" ||
          !deadline ||
          deadline <= new Date()
        ) {
          throw new BadRequestException({
            code: "PAYMENT_EXPIRED",
            message: "Booking is no longer payable",
          });
        }
        if (booking.payment?.payment_url)
          return {
            paymentId: booking.payment.id,
            paymentUrl: booking.payment.payment_url,
            expiresAt: deadline,
          };
        const created = await this.provider().createPayment({
          bookingId: booking.id,
          bookingCode: booking.booking_code,
          customerName: booking.booker_name,
          customerEmail: booking.booker_email,
          customerPhone: booking.booker_phone,
          amount: booking.total_amount,
          description: `${booking.activity.title} - ${booking.booking_code}`,
          expiryMinutes: Math.max(
            1,
            Math.ceil((deadline.getTime() - Date.now()) / 60000),
          ),
          expiresAt: deadline,
        });
        if (!created.providerReference)
          throw new BadRequestException({
            code: "PAYMENT_FAILED",
            message: "Provider did not return an invoice reference",
          });
        const payment = await tx.payment.update({
          where: { booking_id: booking.id },
          data: {
            provider: created.provider,
            provider_reference: created.providerReference,
            payment_url: created.paymentUrl,
          },
        });
        return {
          paymentId: payment.id,
          paymentUrl: payment.payment_url,
          expiresAt: deadline,
        };
      },
      { timeout: 20000 },
    );
  }

  /** All durable effects commit together; a retry can recover an unprocessed event. */
  async handleWebhook(rawPayload: unknown) {
    const normalized = await this.providerForEvent(
      rawPayload,
    ).verifyAndNormalizeWebhook(rawPayload as never);
    const { providerEventId, eventType, providerReference, amount, status } =
      normalized;
    if (!providerEventId || !providerReference || !Number.isFinite(amount))
      throw new BadRequestException({
        code: "PAYMENT_FAILED",
        message: "Incomplete payment event",
      });
    const found = await this.prisma.payment.findFirst({
      where: {
        provider: this.providerForEvent(rawPayload).name,
        provider_reference: providerReference,
      },
    });
    if (!found)
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "Payment not found",
      });
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM bookings WHERE id = ${found.booking_id}::uuid FOR UPDATE`;
      const payment = await tx.payment.findUniqueOrThrow({
        where: { id: found.id },
        include: { booking: true },
      });
      if (amount !== payment.amount)
        throw new BadRequestException({
          code: "PAYMENT_AMOUNT_MISMATCH",
          message: "Provider amount does not match booking total",
        });
      // Serialize event identity too: an event cannot be reused against a different invoice.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"payment-event:" + providerEventId}))`;
      const existing = await tx.paymentEvent.findUnique({
        where: { provider_event_id: providerEventId },
      });
      if (existing && existing.payment_id !== payment.id)
        throw new BadRequestException({
          code: "PAYMENT_FAILED",
          message: "Event belongs to another payment",
        });
      if (existing?.processed_at)
        return {
          idempotent: true,
          payment: { id: payment.id, status: payment.status },
        };
      const event =
        existing ??
        (await tx.paymentEvent.create({
          data: {
            payment_id: payment.id,
            provider_event_id: providerEventId,
            event_type: eventType,
            raw_payload: rawPayload as object,
          },
        }));
      let nextStatus = payment.status;
      if (status === "PAID" && !["PAID", "REFUNDED"].includes(payment.status)) {
        const timely =
          payment.booking.status === "PENDING_PAYMENT" &&
          payment.expires_at !== null &&
          payment.expires_at > new Date();
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: "PAID", paid_at: new Date() },
        });
        nextStatus = "PAID";
        await tx.booking.update({
          where: { id: payment.booking_id },
          data: { status: timely ? "CONFIRMED" : "REFUND_PENDING" },
        });
        if (timely) {
          await this.tickets.issueForBooking(payment.booking_id, tx);
          await tx.notification.upsert({
            where: { dedupe_key: `booking-confirmed:${payment.booking_id}` },
            update: {},
            create: {
              dedupe_key: `booking-confirmed:${payment.booking_id}`,
              booking_id: payment.booking_id,
              channel: "email",
              template: "booking_confirmed",
              status: "QUEUED",
              payload: {
                type: "booking_confirmed",
                to: payment.booking.booker_email,
                bookingCode: payment.booking.booking_code,
              },
            },
          });
        } else {
          await tx.refund.create({
            data: {
              booking_id: payment.booking_id,
              payment_id: payment.id,
              type: "full",
              amount: payment.amount,
              gross_amount: payment.amount,
              vendor_liability: 0,
              platform_liability: payment.amount,
              reason:
                "Payment arrived after the booking deadline; capacity was not reconfirmed",
              status: "PENDING",
              previous_booking_status: payment.booking.status,
            },
          });
        }
        await tx.auditLog.create({
          data: {
            action: "WEBHOOK",
            resource_type: "Payment",
            resource_id: payment.id,
            metadata: { providerEventId, amount, late: !timely },
          },
        });
      } else if (status === "FAILED" && payment.status === "PENDING") {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: "FAILED" },
        });
        await tx.booking.updateMany({
          where: { id: payment.booking_id, status: "PENDING_PAYMENT" },
          data: { status: "EXPIRED" },
        });
        nextStatus = "FAILED";
      }
      await tx.paymentEvent.update({
        where: { id: event.id },
        data: { processed_at: new Date() },
      });
      return {
        idempotent: false,
        payment: { id: payment.id, status: nextStatus },
      };
    });
  }
}

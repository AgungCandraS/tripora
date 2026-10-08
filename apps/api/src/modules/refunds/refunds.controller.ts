import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Body,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/auth.decorators";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { PrismaService } from "../../prisma/prisma.service";

@ApiTags("refunds")
@ApiBearerAuth()
@Controller("refunds")
export class RefundsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @Roles("VENDOR_OWNER")
  async request(
    @Body() body: { bookingId: string; reason: string },
    @CurrentUser() user: AuthUser,
  ) {
    if (!user.vendorId || !body.reason?.trim())
      throw new BadRequestException({
        code: "REFUND_NOT_ALLOWED",
        message: "Vendor and reason are required",
      });
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"payout:" + user.vendorId}))`;
      await tx.$queryRaw`SELECT id FROM bookings WHERE id = ${body.bookingId}::uuid FOR UPDATE`;
      const booking = await tx.booking.findUniqueOrThrow({
        where: { id: body.bookingId },
        include: { payment: true, earnings: true },
      });
      if (
        booking.vendor_id !== user.vendorId ||
        booking.payment?.status !== "PAID" ||
        !["CONFIRMED", "CHECKED_IN", "COMPLETED"].includes(booking.status) ||
        booking.earnings.some(
          (earning) =>
            earning.settlement_status === "RELEASED" ||
            earning.payout_id !== null,
        )
      )
        throw new BadRequestException({
          code: "REFUND_NOT_ALLOWED",
          message:
            "Booking is not refundable or balance is reserved for payout",
        });
      const policy = (booking.cancellation_policy_snapshot ?? {}) as {
        greater_than_7_days_percent?: number;
        three_to_seven_days_percent?: number;
        less_than_3_days_percent?: number;
      };
      const days = (booking.booking_date.getTime() - Date.now()) / 86400000;
      const ratio =
        (days > 7
          ? (policy.greater_than_7_days_percent ?? 100)
          : days >= 3
            ? (policy.three_to_seven_days_percent ?? 50)
            : (policy.less_than_3_days_percent ?? 0)) / 100;
      if (!Number.isFinite(ratio) || ratio <= 0 || ratio > 1)
        throw new BadRequestException({
          code: "REFUND_NOT_ALLOWED",
          message: "Non-refundable window",
        });
      const amount = Math.round(booking.total_amount * ratio);
      const vendorLiability = Math.round(booking.vendor_net_amount * ratio);
      const refund = await tx.refund.create({
        data: {
          booking_id: booking.id,
          payment_id: booking.payment.id,
          type: ratio === 1 ? "full" : "partial",
          amount,
          gross_amount: booking.total_amount,
          vendor_liability: vendorLiability,
          platform_liability: amount - vendorLiability,
          reason: body.reason.trim().slice(0, 2000),
          status: "PENDING",
          previous_booking_status: booking.status,
        },
      });
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: "REFUND_PENDING" },
      });
      await tx.auditLog.create({
        data: {
          actor_user_id: user.id,
          action: "CREATE",
          resource_type: "Refund",
          resource_id: refund.id,
        },
      });
      return refund;
    });
  }

  @Roles("ADMIN")
  @Post(":id/approve")
  async approve(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.decide(id, user, "APPROVED");
  }

  @Roles("ADMIN")
  @Post(":id/reject")
  async reject(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.decide(id, user, "REJECTED");
  }

  @Roles("ADMIN")
  @Post(":id/process")
  async process(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { reference?: string },
  ) {
    if (!body.reference?.trim())
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "Completed refund transfer reference is required",
      });
    return this.decide(
      id,
      user,
      "PROCESSED",
      body.reference.trim().slice(0, 200),
    );
  }

  private async decide(
    id: string,
    user: AuthUser,
    next: "APPROVED" | "REJECTED" | "PROCESSED",
    reference?: string,
  ) {
    const found = await this.prisma.refund.findUniqueOrThrow({
      where: { id },
      include: { booking: true },
    });
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"payout:" + found.booking.vendor_id}))`;
      await tx.$queryRaw`SELECT id FROM bookings WHERE id = ${found.booking_id}::uuid FOR UPDATE`;
      const refund = await tx.refund.findUniqueOrThrow({ where: { id } });
      if (refund.status !== (next === "PROCESSED" ? "APPROVED" : "PENDING"))
        throw new BadRequestException({
          code: "INVALID_STATE_TRANSITION",
          message: "Refund already decided",
        });
      if (next === "REJECTED") {
        if (
          ["EXPIRED", "CANCELLED"].includes(
            refund.previous_booking_status ?? "",
          )
        )
          throw new BadRequestException({
            code: "REFUND_NOT_ALLOWED",
            message: "Late payment must be returned",
          });
        await tx.booking.update({
          where: { id: refund.booking_id },
          data: { status: refund.previous_booking_status ?? "CONFIRMED" },
        });
      }
      if (next === "PROCESSED") {
        await tx.booking.update({
          where: { id: refund.booking_id },
          data: { status: "REFUNDED" },
        });
        await tx.payment.update({
          where: { id: refund.payment_id },
          data: { status: "REFUNDED" },
        });
        await tx.ticket.updateMany({
          where: { booking_id: refund.booking_id },
          data: { status: "VOID" },
        });
        await tx.vendorEarning.updateMany({
          where: { booking_id: refund.booking_id },
          data: { refund_amount: { increment: refund.vendor_liability } },
        });
      }
      const updated = await tx.refund.update({
        where: { id },
        data: {
          status: next,
          approved_by: user.id,
          ...(next === "PROCESSED"
            ? { processed_at: new Date(), provider_reference: reference }
            : {}),
        },
      });
      await tx.auditLog.create({
        data: {
          actor_user_id: user.id,
          action: next === "REJECTED" ? "REJECT" : "APPROVE",
          resource_type: "Refund",
          resource_id: id,
          metadata: { status: next, reference },
        },
      });
      return updated;
    });
  }

  @Roles("ADMIN")
  @Get()
  async list(@Query("limit") limit?: string) {
    return this.prisma.refund.findMany({
      orderBy: { id: "desc" },
      take: Math.min(Math.max(Number(limit) || 50, 1), 500),
    });
  }
}

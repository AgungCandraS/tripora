import { BadRequestException, Controller, Get, Param, Post, Body, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/auth.decorators";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

@ApiTags("refunds")
@ApiBearerAuth()
@Controller("refunds")
export class RefundsController {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  @Post()
  @Roles("VENDOR_OWNER")
  async request(@Body() body: { bookingId: string; reason: string; type?: string }, @CurrentUser() user: AuthUser) {
    const booking = await this.prisma.booking.findUniqueOrThrow({ where: { id: body.bookingId }, include: { payment: true, vendor: true } });
    // IDOR guard (OWASP A01): vendor hanya boleh refund booking MILIKNYA.
    if (!user.vendorId || booking.vendor_id !== user.vendorId) {
      throw new BadRequestException({ code: "REFUND_NOT_ALLOWED", message: "Not allowed" });
    }
    if (!["CONFIRMED", "CHECKED_IN", "COMPLETED"].includes(booking.status)) {
      throw new BadRequestException({ code: "REFUND_NOT_ALLOWED", message: "Booking state is not refundable" });
    }
    // Cancellation policy from booking snapshot (PRD §53), fallback to platform default.
    const policy = (booking.cancellation_policy_snapshot ?? {}) as {
      greater_than_7_days_percent?: number;
      three_to_seven_days_percent?: number;
      less_than_3_days_percent?: number;
    };
    const days = Math.ceil((booking.booking_date.getTime() - Date.now()) / 86400000);
    const ratio = ((days > 7 ? policy.greater_than_7_days_percent ?? 100 : days >= 3 ? policy.three_to_seven_days_percent ?? 50 : policy.less_than_3_days_percent ?? 0) as number) / 100;
    if (ratio <= 0) throw new BadRequestException({ code: "REFUND_NOT_ALLOWED", message: "Non-refundable window" });
    const amount = Math.round(booking.total_amount * ratio);
    // Liability split: platform absorbs its fee share proportionally, vendor the rest (FINANCE_FLOW.md).
    const platformLiability = booking.total_amount > 0 ? Math.round((amount * booking.platform_fee) / booking.total_amount) : 0;
    const vendorLiability = amount - platformLiability;

    const refund = await this.prisma.refund.create({
      data: {
        booking_id: booking.id,
        payment_id: booking.payment?.id ?? (await this.ensurePaymentId(booking.id)),
        type: amount >= booking.total_amount ? "full" : (body.type ?? "partial"),
        amount,
        gross_amount: booking.total_amount,
        vendor_liability: vendorLiability,
        platform_liability: platformLiability,
        provider_reference: booking.payment?.provider_reference ?? null,
        reason: body.reason,
        status: "PENDING",
      },
    });
    await this.prisma.booking.update({ where: { id: booking.id }, data: { status: "REFUND_PENDING" } });
    await this.audit.log({ actorUserId: user.id, action: "CREATE", resourceType: "Refund", resourceId: refund.id });
    return refund;
  }

  private async ensurePaymentId(bookingId: string): Promise<string> {
    const payment = await this.prisma.payment.findUnique({ where: { booking_id: bookingId } });
    if (payment) return payment.id;
    const booking = await this.prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    const created = await this.prisma.payment.create({
      data: { booking_id: bookingId, provider: "system", amount: booking.total_amount, status: "PAID" },
    });
    return created.id;
  }

  @Roles("ADMIN")
  @Post(":id/approve")
  async approve(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    const refund = await this.prisma.refund.findUniqueOrThrow({ where: { id } });
    if (refund.status !== "PENDING") {
      throw new BadRequestException({ code: "INVALID_STATE_TRANSITION", message: "Refund already decided" });
    }
    const updated = await this.prisma.refund.update({ where: { id }, data: { status: "PROCESSED", approved_by: user.id, processed_at: new Date() } });
    await this.prisma.booking.update({ where: { id: refund.booking_id }, data: { status: "REFUNDED" } });
    await this.prisma.payment.updateMany({ where: { booking_id: refund.booking_id }, data: { status: "REFUNDED" } });
    await this.prisma.vendorEarning.updateMany({ where: { booking_id: refund.booking_id }, data: { refund_amount: { increment: refund.vendor_liability } } });
    await this.audit.log({ actorUserId: user.id, action: "APPROVE", resourceType: "Refund", resourceId: id });
    return updated;
  }

  @Roles("ADMIN")
  @Post(":id/reject")
  async reject(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    const refund = await this.prisma.refund.findUniqueOrThrow({ where: { id } });
    if (refund.status !== "PENDING") {
      throw new BadRequestException({ code: "INVALID_STATE_TRANSITION", message: "Refund already decided" });
    }
    const updated = await this.prisma.refund.update({ where: { id }, data: { status: "REJECTED", approved_by: user.id } });
    await this.prisma.booking.update({ where: { id: refund.booking_id }, data: { status: "CONFIRMED" } });
    await this.audit.log({ actorUserId: user.id, action: "REJECT", resourceType: "Refund", resourceId: id });
    return updated;
  }

  @Roles("ADMIN")
  @Get()
  async list(@Query("limit") limit?: string) {
    return this.prisma.refund.findMany({ orderBy: { id: "desc" }, take: Math.min(Number(limit) || 50, 500) });
  }
}

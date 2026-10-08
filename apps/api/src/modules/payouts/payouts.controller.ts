import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Body,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { Roles } from "../../common/decorators/auth.decorators";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { SettingsService } from "../settings/settings.service";
import { settlementEligibleBooking } from "../../common/utils/settlement";

@ApiTags("vendor-payouts")
@ApiBearerAuth()
@Controller("vendor/payouts")
export class VendorPayoutsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    if (!user.vendorId) return { payouts: [] };
    return this.prisma.payout.findMany({
      where: { vendor_id: user.vendorId },
      orderBy: { requested_at: "desc" },
    });
  }

  @Get("balance")
  async balance(@CurrentUser() user: AuthUser) {
    if (!user.vendorId) return { available: 0, minimum: 0 };
    return {
      available: await this.availableBalance(user.vendorId),
      minimum: await this.settings.getNumber(
        "PAYOUT_MINIMUM",
        this.config.get<number>("PAYOUT_MINIMUM", 50000),
      ),
    };
  }

  /** Available = Σ(net − refund) over unsettled earnings. Never exceeds ledger (PRD §64, §110). */
  private async availableBalance(vendorId: string): Promise<number> {
    const rows = await this.prisma.vendorEarning.findMany({
      where: {
        vendor_id: vendorId,
        settlement_status: "PENDING",
        payout_id: null,
        booking: settlementEligibleBooking,
      },
      select: { id: true, net_amount: true, refund_amount: true },
    });
    return rows.reduce((a, r) => a + r.net_amount - r.refund_amount, 0);
  }

  @Post()
  @Roles("VENDOR_OWNER")
  async request(@CurrentUser() user: AuthUser) {
    if (!user.vendorId) throw new Error("No vendor attached");
    const vendorId = user.vendorId;
    // Serialize per-vendor payout requests so concurrent calls can't exceed available.
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"payout:" + vendorId}))`;
      const rows = await tx.vendorEarning.findMany({
        where: {
          vendor_id: vendorId,
          settlement_status: "PENDING",
          payout_id: null,
          booking: settlementEligibleBooking,
        },
        select: { id: true, net_amount: true, refund_amount: true },
      });
      const amount = rows.reduce(
        (a, r) => a + r.net_amount - r.refund_amount,
        0,
      );
      const minimum = await this.settings.getNumber(
        "PAYOUT_MINIMUM",
        this.config.get<number>("PAYOUT_MINIMUM", 50000),
      );
      if (amount < minimum) {
        throw new BadRequestException({
          code: "PAYOUT_BELOW_MINIMUM",
          message: `Available balance is below minimum payout (${minimum}).`,
        });
      }
      const pending = await tx.payout.count({
        where: { vendor_id: vendorId, status: "PENDING" },
      });
      if (pending > 0) {
        throw new BadRequestException({
          code: "PAYOUT_ALREADY_PENDING",
          message: "A payout request is already pending review.",
        });
      }
      const payout = await tx.payout.create({
        data: { vendor_id: vendorId, amount, status: "PENDING" },
      });
      await tx.vendorEarning.updateMany({
        where: { id: { in: rows.map((row) => row.id) } },
        data: { payout_id: payout.id },
      });
      await tx.auditLog.create({
        data: {
          actor_user_id: user.id,
          action: "CREATE",
          resource_type: "Payout",
          resource_id: payout.id,
        },
      });
      return payout;
    });
  }
}

@ApiTags("admin-payouts")
@ApiBearerAuth()
@Roles("ADMIN")
@Controller("admin/payouts")
export class AdminPayoutsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list() {
    return this.prisma.payout.findMany({
      orderBy: { requested_at: "desc" },
      include: { vendor: true },
    });
  }

  @Post(":id/process")
  async process(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() body: { reference?: string },
  ) {
    if (!body.reference?.trim())
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "Bank transfer reference is required",
      });
    return this.decide(user, id, true, body.reference.trim().slice(0, 200));
  }

  @Post(":id/fail")
  async fail(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() body: { reason: string },
  ) {
    if (!body.reason?.trim())
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "Reason is required",
      });
    return this.decide(user, id, false, body.reason.trim().slice(0, 200));
  }

  private async decide(
    user: AuthUser,
    id: string,
    success: boolean,
    reference: string,
  ) {
    const existing = await this.prisma.payout.findUniqueOrThrow({
      where: { id },
    });
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"payout:" + existing.vendor_id}))`;
      const payout = await tx.payout.findUniqueOrThrow({
        where: { id },
        include: {
          earnings: { include: { booking: { include: { payment: true } } } },
        },
      });
      if (payout.status !== "PENDING")
        throw new BadRequestException({
          code: "INVALID_STATE_TRANSITION",
          message: "Payout already decided",
        });
      const eligible = success
        ? await tx.vendorEarning.count({
            where: {
              payout_id: id,
              settlement_status: "PENDING",
              booking: settlementEligibleBooking,
            },
          })
        : 0;
      if (
        success &&
        (payout.earnings.reduce(
          (total, row) => total + row.net_amount - row.refund_amount,
          0,
        ) !== payout.amount ||
          eligible !== payout.earnings.length)
      )
        throw new BadRequestException({
          code: "PAYOUT_CHANGED",
          message:
            "Reserved balance changed. Fail this request and request again",
        });
      const updated = await tx.payout.update({
        where: { id },
        data: {
          status: success ? "PROCESSED" : "FAILED",
          processed_at: new Date(),
          reference,
        },
      });
      await tx.vendorEarning.updateMany({
        where: { payout_id: id },
        data: success ? { settlement_status: "RELEASED" } : { payout_id: null },
      });
      await tx.auditLog.create({
        data: {
          actor_user_id: user.id,
          action: "UPDATE",
          resource_type: "Payout",
          resource_id: id,
          metadata: { reference, success },
        },
      });
      return updated;
    });
  }
}

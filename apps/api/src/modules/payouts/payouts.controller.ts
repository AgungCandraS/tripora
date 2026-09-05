import { BadRequestException, Controller, Get, Param, Post, Body } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { Roles } from "../../common/decorators/auth.decorators";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { SettingsService } from "../settings/settings.service";

@ApiTags("vendor-payouts")
@ApiBearerAuth()
@Controller("vendor/payouts")
export class VendorPayoutsController {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService, private readonly settings: SettingsService, private readonly audit: AuditService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    if (!user.vendorId) return { payouts: [] };
    return this.prisma.payout.findMany({ where: { vendor_id: user.vendorId }, orderBy: { requested_at: "desc" } });
  }

  @Get("balance")
  async balance(@CurrentUser() user: AuthUser) {
    if (!user.vendorId) return { available: 0, minimum: 0 };
    return { available: await this.availableBalance(user.vendorId), minimum: await this.settings.getNumber("PAYOUT_MINIMUM", this.config.get<number>("PAYOUT_MINIMUM", 50000)) };
  }

  /** Available = Σ(net − refund) over unsettled earnings. Never exceeds ledger (PRD §64, §110). */
  private async availableBalance(vendorId: string): Promise<number> {
    const rows = await this.prisma.vendorEarning.findMany({
      where: { vendor_id: vendorId, settlement_status: "PENDING" },
      select: { net_amount: true, refund_amount: true },
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
        where: { vendor_id: vendorId, settlement_status: "PENDING" },
        select: { net_amount: true, refund_amount: true },
      });
      const amount = rows.reduce((a, r) => a + r.net_amount - r.refund_amount, 0);
      const minimum = await this.settings.getNumber("PAYOUT_MINIMUM", this.config.get<number>("PAYOUT_MINIMUM", 50000));
      if (amount < minimum) {
        throw new BadRequestException({ code: "PAYOUT_BELOW_MINIMUM", message: `Available balance is below minimum payout (${minimum}).` });
      }
      const pending = await tx.payout.count({ where: { vendor_id: vendorId, status: "PENDING" } });
      if (pending > 0) {
        throw new BadRequestException({ code: "PAYOUT_ALREADY_PENDING", message: "A payout request is already pending review." });
      }
      const payout = await tx.payout.create({ data: { vendor_id: vendorId, amount, status: "PENDING" } });
      await this.audit.log({ actorUserId: user.id, action: "CREATE", resourceType: "Payout", resourceId: payout.id });
      return payout;
    });
  }
}

@ApiTags("admin-payouts")
@ApiBearerAuth()
@Roles("ADMIN")
@Controller("admin/payouts")
export class AdminPayoutsController {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  @Get()
  async list() {
    return this.prisma.payout.findMany({ orderBy: { requested_at: "desc" }, include: { vendor: true } });
  }

  @Post(":id/process")
  async process(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    const existing = await this.prisma.payout.findUniqueOrThrow({ where: { id } });
    if (existing.status !== "PENDING") {
      throw new BadRequestException({ code: "INVALID_STATE_TRANSITION", message: "Payout already decided" });
    }
    const payout = await this.prisma.payout.update({ where: { id }, data: { status: "PROCESSED", processed_at: new Date(), reference: `PAY-${Date.now()}` } });
    await this.prisma.vendorEarning.updateMany({ where: { vendor_id: payout.vendor_id, settlement_status: "PENDING" }, data: { settlement_status: "RELEASED" } });
    await this.audit.log({ actorUserId: user.id, action: "UPDATE", resourceType: "Payout", resourceId: id });
    return payout;
  }

  @Post(":id/fail")
  async fail(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() body: { reason: string }) {
    const existing = await this.prisma.payout.findUniqueOrThrow({ where: { id } });
    if (existing.status !== "PENDING") {
      throw new BadRequestException({ code: "INVALID_STATE_TRANSITION", message: "Payout already decided" });
    }
    // Failed payout stays reversible + audited, never silently marked paid (FINANCE_FLOW.md).
    const payout = await this.prisma.payout.update({
      where: { id },
      data: { status: "FAILED", processed_at: new Date(), reference: body?.reason?.slice(0, 200) ?? "FAILED" },
    });
    await this.audit.log({ actorUserId: user.id, action: "UPDATE", resourceType: "Payout", resourceId: id, metadata: { transition: "PENDING->FAILED", reason: body?.reason } });
    return payout;
  }
}

import { BadRequestException, Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/auth.decorators";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

@ApiTags("admin")
@ApiBearerAuth()
@Roles("ADMIN")
@Controller("admin")
export class AdminController {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  @Get("dashboard")
  async dashboard() {
    const [bookings, vendors, activities, payments] = await this.prisma.$transaction([
      this.prisma.booking.count(),
      this.prisma.vendor.count(),
      this.prisma.activity.count(),
      this.prisma.payment.aggregate({ _sum: { amount: true } }),
    ]);
    return { bookings, vendors, activities, gross: payments._sum.amount ?? 0 };
  }

  @Get("vendors")
  async vendors() {
    return this.prisma.vendor.findMany({ orderBy: { created_at: "desc" }, include: { owner: true, documents: true } });
  }

  @Post("vendors/:id/approve")
  async approveVendor(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    await this.setVendorStatus(id, "APPROVED", user.id);
    return { ok: true };
  }

  @Post("vendors/:id/reject")
  async rejectVendor(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    await this.setVendorStatus(id, "REJECTED", user.id);
    return { ok: true };
  }

  @Post("vendors/:id/suspend")
  async suspendVendor(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    await this.setVendorStatus(id, "SUSPENDED", user.id);
    return { ok: true };
  }

  @Patch("vendors/:id/commission")
  async setCommission(@Param("id") id: string, @Body() body: { rate: number }, @CurrentUser() user: AuthUser) {
    const rate = Number(body.rate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 0.3) {
      throw new BadRequestException({ code: "VALIDATION_ERROR", message: "rate must be 0–0.3" });
    }
    const vendor = await this.prisma.vendor.update({ where: { id }, data: { commission_rate_default: rate } });
    await this.audit.log({ actorUserId: user.id, action: "UPDATE", resourceType: "Vendor", resourceId: id, metadata: { commission_rate: rate } });
    return vendor;
  }

  @Get("activities")
  async activities() {
    return this.prisma.activity.findMany({ orderBy: { created_at: "desc" }, include: { vendor: true } });
  }

  @Post("activities/:id/approve")
  async approveActivity(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.setActivityStatus(id, "PUBLISHED", user.id);
  }

  @Post("activities/:id/reject")
  async rejectActivity(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.setActivityStatus(id, "REJECTED", user.id);
  }

  @Post("activities/:id/suspend")
  async suspendActivity(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.setActivityStatus(id, "SUSPENDED", user.id);
  }

  @Get("bookings")
  async bookings() {
    return this.prisma.booking.findMany({ orderBy: { created_at: "desc" }, take: 200, include: { vendor: true, activity: true, payment: true } });
  }

  @Get("payments")
  async payments() {
    return this.prisma.payment.findMany({ orderBy: { id: "desc" }, take: 200, include: { booking: true } });
  }

  private async setVendorStatus(id: string, status: string, actor: string) {
    const vendor = await this.prisma.vendor.update({ where: { id }, data: { status: status as never } });
    await this.audit.log({ actorUserId: actor, action: status === "APPROVED" ? "APPROVE" : "REJECT", resourceType: "Vendor", resourceId: id });
    return vendor;
  }

  private async setActivityStatus(id: string, status: string, actor: string) {
    const activity = await this.prisma.activity.update({ where: { id }, data: { status: status as never } });
    await this.audit.log({ actorUserId: actor, action: status === "PUBLISHED" ? "APPROVE" : "REJECT", resourceType: "Activity", resourceId: id });
    return activity;
  }
}

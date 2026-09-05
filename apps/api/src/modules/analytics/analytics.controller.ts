import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/auth.decorators";
import { PrismaService } from "../../prisma/prisma.service";

@ApiTags("analytics")
@ApiBearerAuth()
@Roles("ADMIN")
@Controller("admin/analytics")
export class AnalyticsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("overview")
  async overview(@Query("from") from?: string, @Query("to") to?: string) {
    const range = {
      gte: from ? new Date(from) : new Date(Date.now() - 30 * 86400000),
      lte: to ? new Date(to) : new Date(),
    };

    const [gross, vendors, publishedActivities, refundsPending] = await this.prisma.$transaction([
      this.prisma.booking.aggregate({ where: { created_at: range }, _sum: { total_amount: true }, _count: true }),
      this.prisma.vendor.aggregate({ _count: true }),
      this.prisma.activity.count({ where: { status: "PUBLISHED" } }),
      this.prisma.refund.count({ where: { status: "PENDING" } }),
    ]);

    return {
      gross: gross._sum.total_amount ?? 0,
      bookings: gross._count,
      vendors: vendors._count,
      publishedActivities,
      refundsPending,
    };
  }
}

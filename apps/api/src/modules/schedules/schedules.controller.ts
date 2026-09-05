import { BadRequestException, Controller, Get, Param, Post, Query, Body } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { PrismaService } from "../../prisma/prisma.service";

@ApiTags("vendor-schedules")
@ApiBearerAuth()
@Controller("vendor/calendar")
export class VendorCalendarController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async calendar(@CurrentUser() user: AuthUser, @Query("from") from?: string, @Query("to") to?: string) {
    if (!user.vendorId) throw new BadRequestException({ code: "FORBIDDEN", message: "No vendor attached" });
    const activities = await this.prisma.activity.findMany({ where: { vendor_id: user.vendorId }, select: { id: true } });
    const packages = await this.prisma.package.findMany({ where: { activity_id: { in: activities.map((a) => a.id) } }, select: { id: true } });
    return this.prisma.schedule.findMany({
      where: { package_id: { in: packages.map((p) => p.id) } },
      include: { package: { include: { activity: true } }, overrides: true },
      orderBy: { start_time: "asc" },
    });
  }

  @Post("schedules")
  async create(@CurrentUser() user: AuthUser, @Body() body: { packageId: string; dayOfWeek?: number; specificDate?: string; startTime: string; endTime: string; capacity: number }) {
    if (!user.vendorId) throw new BadRequestException({ code: "FORBIDDEN", message: "No vendor attached" });
    return this.prisma.schedule.create({
      data: {
        package_id: body.packageId,
        day_of_week: body.dayOfWeek,
        specific_date: body.specificDate ? new Date(`${body.specificDate}T00:00:00Z`) : undefined,
        start_time: body.startTime,
        end_time: body.endTime,
        capacity: body.capacity,
        status: "ACTIVE",
      },
    });
  }
}

import { BadRequestException, Controller, Get, Param, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { NotFoundException } from "@nestjs/common";
import { Public } from "../../common/decorators/auth.decorators";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { PrismaService } from "../../prisma/prisma.service";

@ApiTags("activities")
@Controller("activities")
export class ActivitiesController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async list(@Query("destination") destination?: string, @Query("category") category?: string) {
    return this.prisma.activity.findMany({
      where: {
        status: "PUBLISHED",
        destination: destination ? { slug: destination } : undefined,
        categories: category ? { some: { category: { slug: category } } } : undefined,
      },
      include: { destination: true, images: true, categories: { include: { category: true } }, packages: true },
      orderBy: { created_at: "desc" },
    });
  }

  @Public()
  @Get(":slug")
  async get(@Param("slug") slug: string) {
    const activity = await this.prisma.activity.findUnique({
      where: { slug },
      include: { destination: true, vendor: { select: { id: true, name: true, slug: true } }, images: true, categories: { include: { category: true } }, packages: { include: { schedules: true } } },
    });
    if (!activity) throw new NotFoundException({ code: "NOT_FOUND", message: "Activity not found" });
    return activity;
  }
}

@ApiTags("vendor-activities")
@ApiBearerAuth()
@Controller("vendor/activities")
export class VendorActivitiesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async listMine(@CurrentUser() user: AuthUser) {
    if (!user.vendorId) throw new BadRequestException({ code: "FORBIDDEN", message: "No vendor attached" });
    return this.prisma.activity.findMany({
      where: { vendor_id: user.vendorId },
      include: { packages: true },
      orderBy: { created_at: "desc" },
    });
  }
}

import { BadRequestException, Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/auth.decorators";
import { Permissions } from "../../common/decorators/permission.decorators";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { PrismaService } from "../../prisma/prisma.service";

class UpsertPackageDto {
  @IsString()
  activityId!: string;

  @IsString()
  @MinLength(3)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(0)
  base_price!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  duration_minutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  min_participants?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  max_participants?: number;
}

@ApiTags("vendor-packages")
@ApiBearerAuth()
@Roles("VENDOR_OWNER")
@Controller("vendor/packages")
export class VendorPackagesController {
  constructor(private readonly prisma: PrismaService) {}

  private async ownActivity(user: AuthUser, activityId: string) {
    if (!user.vendorId) throw new BadRequestException({ code: "FORBIDDEN", message: "No vendor attached" });
    const activity = await this.prisma.activity.findFirst({ where: { id: activityId, vendor_id: user.vendorId } });
    if (!activity) throw new BadRequestException({ code: "NOT_FOUND", message: "Activity not found" });
    return activity;
  }

  @Get()
  @Roles("VENDOR_OWNER", "VENDOR_STAFF", "ADMIN")
  @Permissions("activity.read")
  async list(@CurrentUser() user: AuthUser) {
    if (!user.vendorId) return { packages: [] };
    const packages = await this.prisma.package.findMany({
      where: { activity: { vendor_id: user.vendorId } },
      include: { activity: { select: { id: true, title: true } }, schedules: true },
      orderBy: { name: "asc" },
    });
    return { packages };
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: UpsertPackageDto) {
    await this.ownActivity(user, dto.activityId);
    const { activityId, ...rest } = dto;
    return this.prisma.package.create({ data: { ...rest, activity_id: activityId, status: "ACTIVE" } });
  }

  @Patch(":id")
  async update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: Partial<UpsertPackageDto>) {
    const pkg = await this.prisma.package.findUnique({ where: { id }, include: { activity: true } });
    if (!pkg || pkg.activity.vendor_id !== user.vendorId) {
      throw new BadRequestException({ code: "NOT_FOUND", message: "Package not found" });
    }
    // Mass-assignment guard (OWASP A01): activity_id/status tak bisa diubah via sini.
    const data: {
      name?: string;
      description?: string | null;
      base_price?: number;
      duration_minutes?: number | null;
      min_participants?: number;
      max_participants?: number;
    } = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.base_price !== undefined) data.base_price = dto.base_price;
    if (dto.duration_minutes !== undefined) data.duration_minutes = dto.duration_minutes;
    if (dto.min_participants !== undefined) data.min_participants = dto.min_participants;
    if (dto.max_participants !== undefined) data.max_participants = dto.max_participants;
    return this.prisma.package.update({ where: { id }, data });
  }
}

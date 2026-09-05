import { BadRequestException, Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/auth.decorators";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

class CreateActivityDto {
  @IsString()
  @MinLength(3)
  title!: string;

  @IsString()
  destinationId!: string;

  @IsOptional()
  @IsString()
  short_description?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  meeting_point?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  min_age?: number;

  @IsOptional()
  categoryIds?: string[];
}

@ApiTags("vendor-activities-write")
@ApiBearerAuth()
@Roles("VENDOR_OWNER")
@Controller("vendor/activities")
export class VendorActivitiesWriteController {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  private slugify(title: string) {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateActivityDto) {
    if (!user.vendorId) throw new BadRequestException({ code: "FORBIDDEN", message: "No vendor attached" });
    const base = this.slugify(dto.title);
    const slug = `${base}-${Date.now().toString(36)}`;
    const activity = await this.prisma.activity.create({
      data: {
        vendor_id: user.vendorId,
        destination_id: dto.destinationId,
        title: dto.title,
        slug,
        short_description: dto.short_description,
        description: dto.description,
        meeting_point: dto.meeting_point,
        min_age: dto.min_age,
        status: "DRAFT",
        categories: dto.categoryIds?.length
          ? { create: dto.categoryIds.map((category_id) => ({ category_id })) }
          : undefined,
      },
    });
    await this.audit.log({ actorUserId: user.id, action: "CREATE", resourceType: "Activity", resourceId: activity.id });
    return activity;
  }

  @Patch(":id")
  async update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: Partial<CreateActivityDto>) {
    if (!user.vendorId) throw new BadRequestException({ code: "FORBIDDEN", message: "No vendor attached" });
    const existing = await this.prisma.activity.findFirst({ where: { id, vendor_id: user.vendorId } });
    if (!existing) throw new BadRequestException({ code: "NOT_FOUND", message: "Activity not found" });
    if (existing.status === "PUBLISHED") throw new BadRequestException({ code: "INVALID_STATE_TRANSITION", message: "Published activities are read-only; unpublish first" });
    const { categoryIds: _ignored, destinationId, ...rest } = dto;
    return this.prisma.activity.update({
      where: { id },
      data: { ...rest, destination_id: destinationId },
    });
  }

  @Post(":id/submit")
  async submit(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    if (!user.vendorId) throw new BadRequestException({ code: "FORBIDDEN", message: "No vendor attached" });
    const existing = await this.prisma.activity.findFirst({ where: { id, vendor_id: user.vendorId }, include: { packages: true } });
    if (!existing) throw new BadRequestException({ code: "NOT_FOUND", message: "Activity not found" });
    if (existing.packages.length === 0) throw new BadRequestException({ code: "VALIDATION_ERROR", message: "Add at least one package first" });
    const updated = await this.prisma.activity.update({ where: { id }, data: { status: "IN_REVIEW" } });
    await this.audit.log({ actorUserId: user.id, action: "UPDATE", resourceType: "Activity", resourceId: id, metadata: { to: "IN_REVIEW" } });
    return updated;
  }

  @Get(":id")
  async getOne(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    if (!user.vendorId) throw new BadRequestException({ code: "FORBIDDEN", message: "No vendor attached" });
    const activity = await this.prisma.activity.findFirst({
      where: { id, vendor_id: user.vendorId },
      include: { packages: { include: { schedules: true } }, categories: { include: { category: true } } },
    });
    if (!activity) throw new BadRequestException({ code: "NOT_FOUND", message: "Activity not found" });
    return activity;
  }
}

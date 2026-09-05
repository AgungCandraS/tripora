import { BadRequestException, Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/auth.decorators";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { PrismaService } from "../../prisma/prisma.service";

class UpsertPromotionDto {
  @IsString()
  @MinLength(3)
  code!: string;

  @IsString()
  type!: "PERCENT" | "NOMINAL";

  @IsInt()
  @Min(1)
  value!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minimum_purchase?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  usage_limit?: number;
}

@ApiTags("vendor-promotions")
@ApiBearerAuth()
@Roles("VENDOR_OWNER")
@Controller("vendor/promotions")
export class VendorPromotionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    if (!user.vendorId) return { promotions: [] };
    const promotions = await this.prisma.promotion.findMany({
      where: { vendor_id: user.vendorId },
      orderBy: { code: "asc" },
    });
    return { promotions };
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: UpsertPromotionDto) {
    if (!user.vendorId) throw new BadRequestException({ code: "FORBIDDEN", message: "No vendor attached" });
    return this.prisma.promotion.create({
      data: { ...dto, code: dto.code.toUpperCase(), vendor_id: user.vendorId, status: "ACTIVE" },
    });
  }

  @Patch(":id")
  async update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: Partial<UpsertPromotionDto & { status: "ACTIVE" | "INACTIVE" }>) {
    const promo = await this.prisma.promotion.findUnique({ where: { id } });
    if (!promo || promo.vendor_id !== user.vendorId) {
      throw new BadRequestException({ code: "NOT_FOUND", message: "Promotion not found" });
    }
    // Mass-assignment guard (OWASP A01): code/vendor_id tak bisa diubah via sini.
    const data: {
      type?: "PERCENT" | "NOMINAL";
      value?: number;
      minimum_purchase?: number | null;
      usage_limit?: number | null;
      status?: "ACTIVE" | "INACTIVE";
    } = {};
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.value !== undefined) data.value = dto.value;
    if (dto.minimum_purchase !== undefined) data.minimum_purchase = dto.minimum_purchase;
    if (dto.usage_limit !== undefined) data.usage_limit = dto.usage_limit;
    if (dto.status !== undefined) data.status = dto.status;
    return this.prisma.promotion.update({ where: { id }, data });
  }
}

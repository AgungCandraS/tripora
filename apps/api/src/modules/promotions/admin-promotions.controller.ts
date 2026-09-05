import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";
import { Roles } from "../../common/decorators/auth.decorators";
import { PrismaService } from "../../prisma/prisma.service";

class UpsertPlatformPromotionDto {
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

@ApiTags("admin-promotions")
@ApiBearerAuth()
@Roles("ADMIN")
@Controller("admin/promotions")
export class AdminPromotionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    return this.prisma.promotion.findMany({ orderBy: { code: "asc" } });
  }

  @Post()
  async create(@Body() dto: UpsertPlatformPromotionDto) {
    return this.prisma.promotion.create({
      data: { ...dto, code: dto.code.toUpperCase(), vendor_id: null, status: "ACTIVE" },
    });
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() dto: Partial<UpsertPlatformPromotionDto & { status: "ACTIVE" | "INACTIVE" }>) {
    const { code, ...rest } = dto;
    return this.prisma.promotion.update({ where: { id }, data: rest });
  }
}

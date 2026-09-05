import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";
import { Roles } from "../../common/decorators/auth.decorators";
import { PrismaService } from "../../prisma/prisma.service";

class UpsertCategoryDto {
  @IsString()
  @MinLength(3)
  name!: string;

  @IsString()
  @MinLength(2)
  slug!: string;
}

@ApiTags("admin-categories")
@ApiBearerAuth()
@Roles("ADMIN")
@Controller("admin/categories")
export class AdminCategoriesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    return this.prisma.category.findMany({ orderBy: { name: "asc" } });
  }

  @Post()
  async create(@Body() dto: UpsertCategoryDto) {
    return this.prisma.category.create({ data: dto });
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() dto: Partial<UpsertCategoryDto>) {
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    await this.prisma.activityCategory.deleteMany({ where: { category_id: id } });
    await this.prisma.category.delete({ where: { id } });
    return { ok: true };
  }
}

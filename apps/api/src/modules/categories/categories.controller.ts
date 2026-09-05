import { Controller, Get, Param } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../../common/decorators/auth.decorators";
import { PrismaService } from "../../prisma/prisma.service";

@ApiTags("categories")
@Public()
@Controller("categories")
export class CategoriesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    return this.prisma.category.findMany();
  }

  @Get(":slug")
  async get(@Param("slug") slug: string) {
    return this.prisma.category.findUnique({ where: { slug }, include: { activity_categories: { include: { activity: true } } } });
  }
}

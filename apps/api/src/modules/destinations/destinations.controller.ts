import { Controller, Get, Param } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { NotFoundException } from "@nestjs/common";
import { Public } from "../../common/decorators/auth.decorators";
import { PrismaService } from "../../prisma/prisma.service";

@ApiTags("destinations")
@Public()
@Controller("destinations")
export class DestinationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    return this.prisma.destination.findMany({ include: { region: true, activities: { where: { status: "PUBLISHED" }, select: { id: true } } } });
  }

  @Get(":slug")
  async get(@Param("slug") slug: string) {
    const destination = await this.prisma.destination.findUnique({
      where: { slug },
      include: { region: true, activities: { where: { status: "PUBLISHED" }, include: { images: true, packages: true, categories: { include: { category: true } } } } },
    });
    if (!destination) throw new NotFoundException({ code: "NOT_FOUND", message: "Destination not found" });
    return destination;
  }
}

import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { NotFoundException } from "@nestjs/common";
import { Public } from "../../common/decorators/auth.decorators";
import { PrismaService } from "../../prisma/prisma.service";

@ApiTags("packages")
@Public()
@Controller("packages")
export class PackagesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(":id")
  async get(@Param("id") id: string) {
    const pkg = await this.prisma.package.findUnique({
      where: {
        id,
        status: "ACTIVE",
        activity: { status: "PUBLISHED", vendor: { status: "APPROVED" } },
      },
      include: { activity: true, schedules: { where: { status: "ACTIVE" } } },
    });
    if (!pkg)
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "Package not found",
      });
    return pkg;
  }
}

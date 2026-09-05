import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../../common/decorators/auth.decorators";
import { PrismaService } from "../../prisma/prisma.service";

@ApiTags("regions")
@Public()
@Controller("regions")
export class RegionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    return this.prisma.region.findMany({ include: { destinations: true } });
  }
}

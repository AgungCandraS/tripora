import { BadRequestException, Body, Controller, Param, Patch } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, Min } from "class-validator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/auth.decorators";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { PrismaService } from "../../prisma/prisma.service";

class UpdateScheduleDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsString()
  status?: "ACTIVE" | "PAUSED" | "ARCHIVED";
}

@ApiTags("vendor-schedules-write")
@ApiBearerAuth()
@Roles("VENDOR_OWNER")
@Controller("vendor/schedules")
export class VendorSchedulesWriteController {
  constructor(private readonly prisma: PrismaService) {}

  @Patch(":id")
  async update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: UpdateScheduleDto) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id },
      include: { package: { include: { activity: true } } },
    });
    if (!schedule || schedule.package.activity.vendor_id !== user.vendorId) {
      throw new BadRequestException({ code: "NOT_FOUND", message: "Schedule not found" });
    }
    return this.prisma.schedule.update({ where: { id }, data: dto });
  }
}

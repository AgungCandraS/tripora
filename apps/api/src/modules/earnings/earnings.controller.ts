import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/auth.decorators";
import { Permissions } from "../../common/decorators/permission.decorators";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { PrismaService } from "../../prisma/prisma.service";

@ApiTags("earnings")
@ApiBearerAuth()
@Controller("vendor/earnings")
export class EarningsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles("VENDOR_OWNER")
  @Permissions("revenue.read")
  async list(@CurrentUser() user: AuthUser) {
    if (!user.vendorId) return { earnings: [] };
    const earnings = await this.prisma.vendorEarning.findMany({
      where: {
        vendor_id: user.vendorId,
        booking: {
          payment: { status: { in: ["PAID", "REFUNDED"] } },
          status: {
            in: [
              "CONFIRMED",
              "CHECKED_IN",
              "COMPLETED",
              "REFUND_PENDING",
              "REFUNDED",
            ],
          },
        },
      },
      orderBy: { id: "desc" },
      include: {
        booking: { include: { activity: { select: { title: true } } } },
      },
    });
    return { earnings };
  }
}

import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsOptional, IsString, MinLength } from "class-validator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { PrismaService } from "../../prisma/prisma.service";

class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  full_name?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

@ApiTags("me")
@ApiBearerAuth()
@Controller("me")
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("profile")
  async profile(@CurrentUser() user: AuthUser) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { roles: { include: { role: true } } },
    });
  }

  @Patch("profile")
  async updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.prisma.user.update({ where: { id: user.id }, data: dto });
  }

  @Get("trips")
  async trips(@CurrentUser() user: AuthUser) {
    const bookings = await this.prisma.booking.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: "desc" },
      include: { activity: true, package: true, ticket: true, review: { select: { id: true } } },
    });
    return { bookings };
  }

  @Get("wishlist")
  async wishlist(@CurrentUser() user: AuthUser) {
    const rows = await this.prisma.wishlist.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: "desc" },
      include: { activity: { include: { destination: true, images: true } } },
    });
    return { wishlist: rows };
  }

  @Post("wishlist/:activityId")
  async addWishlist(@Param("activityId") activityId: string, @CurrentUser() user: AuthUser) {
    return this.prisma.wishlist.upsert({
      where: { user_id_activity_id: { user_id: user.id, activity_id: activityId } },
      update: {},
      create: { user_id: user.id, activity_id: activityId },
    });
  }

  @Delete("wishlist/:activityId")
  async removeWishlist(@Param("activityId") activityId: string, @CurrentUser() user: AuthUser) {
    await this.prisma.wishlist.deleteMany({ where: { user_id: user.id, activity_id: activityId } });
    return { ok: true };
  }
}

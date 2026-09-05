import { BadRequestException, Controller, Get, Param, Patch, Post, Body, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Public } from "../../common/decorators/auth.decorators";
import { Roles } from "../../common/decorators/auth.decorators";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateReviewDto } from "./dto/create-review.dto";

@ApiTags("reviews")
@Controller("reviews")
export class ReviewsController {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  @Public()
  @Get("activity/:activityId")
  async forActivity(@Param("activityId") activityId: string) {
    return this.prisma.review.findMany({ where: { activity_id: activityId, status: "PUBLISHED" }, orderBy: { id: "desc" } });
  }

  @Public()
  @Get("recent/list")
  async recent(@Query("limit") limit?: string) {
    const rows = await this.prisma.review.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { id: "desc" },
      take: Math.min(Number(limit) || 3, 12),
      include: { activity: { select: { title: true, slug: true } }, user: { select: { full_name: true } } },
    });
    return { reviews: rows };
  }

  @ApiBearerAuth()
  @Get("mine/list")
  async mine(@CurrentUser() user: AuthUser) {    const rows = await this.prisma.review.findMany({
      where: { user_id: user.id },
      orderBy: { id: "desc" },
      include: { activity: { select: { title: true, slug: true } }, booking: { select: { booking_code: true, status: true } } },
    });
    return { reviews: rows };
  }

  @ApiBearerAuth()
  @Post("booking/:bookingId")
  async create(@Param("bookingId") bookingId: string, @Body() dto: CreateReviewDto, @CurrentUser() user: AuthUser) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId }, include: { review: true } });
    if (!booking) throw new BadRequestException({ code: "NOT_FOUND", message: "Booking not found" });
    if (booking.user_id !== user.id) throw new BadRequestException({ code: "FORBIDDEN", message: "Not your booking" });
    if (booking.status !== "COMPLETED") throw new BadRequestException({ code: "INVALID_STATE_TRANSITION", message: "Review only after completion" });
    if (booking.review) throw new BadRequestException({ code: "VALIDATION_ERROR", message: "Already reviewed" });

    const review = await this.prisma.review.create({
      data: { booking_id: booking.id, user_id: user.id, activity_id: booking.activity_id, rating: dto.rating, title: dto.title, body: dto.body, status: "PUBLISHED" },
    });
    await this.updateRating(booking.activity_id);
    return review;
  }

  private async updateRating(activityId: string) {
    const agg = await this.prisma.review.aggregate({ where: { activity_id: activityId, status: "PUBLISHED" }, _avg: { rating: true }, _count: true });
    await this.prisma.activity.update({
      where: { id: activityId },
      data: { rating_average: Math.round((agg._avg.rating ?? 0) * 100) / 100, rating_count: agg._count },
    });
  }
}

@ApiTags("vendor-reviews")
@ApiBearerAuth()
@Controller("vendor/reviews")
export class VendorReviewsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles("VENDOR_OWNER", "VENDOR_STAFF", "ADMIN")
  async list(@CurrentUser() user: AuthUser) {
    if (!user.vendorId) return { reviews: [] };
    const rows = await this.prisma.review.findMany({
      where: { activity: { vendor_id: user.vendorId } },
      orderBy: { id: "desc" },
      take: 200,
      include: {
        activity: { select: { title: true, slug: true } },
        user: { select: { full_name: true } },
        booking: { select: { booking_code: true, status: true } },
      },
    });
    const avg = await this.prisma.review.aggregate({
      where: { activity: { vendor_id: user.vendorId }, status: "PUBLISHED" },
      _avg: { rating: true },
      _count: true,
    });
    return { reviews: rows, summary: { average: Math.round(((avg._avg.rating ?? 0) as number) * 100) / 100, count: avg._count } };
  }
}

@ApiTags("admin-reviews")
@ApiBearerAuth()
@Controller("admin/reviews")
export class AdminReviewsController {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  @Get()
  @Roles("ADMIN")
  async list(@Query("status") status?: string) {
    return this.prisma.review.findMany({
      where: status ? { status: status as never } : {},
      orderBy: { id: "desc" },
      take: 200,
      include: {
        activity: { select: { title: true, slug: true, vendor: { select: { name: true } } } },
        user: { select: { full_name: true, email: true } },
      },
    });
  }

  @Patch(":id")
  @Roles("ADMIN")
  async moderate(@Param("id") id: string, @Body() body: { status: "PUBLISHED" | "HIDDEN" }, @CurrentUser() user: AuthUser) {
    if (!["PUBLISHED", "HIDDEN"].includes(body?.status)) {
      throw new BadRequestException({ code: "VALIDATION_ERROR", message: "status must be PUBLISHED or HIDDEN" });
    }
    const review = await this.prisma.review.update({ where: { id }, data: { status: body.status as never } });
    // Recompute activity rating after moderation.
    const agg = await this.prisma.review.aggregate({ where: { activity_id: review.activity_id, status: "PUBLISHED" }, _avg: { rating: true }, _count: true });
    await this.prisma.activity.update({
      where: { id: review.activity_id },
      data: { rating_average: Math.round((agg._avg.rating ?? 0) * 100) / 100, rating_count: agg._count },
    });
    await this.audit.log({ actorUserId: user.id, action: "UPDATE", resourceType: "Review", resourceId: id, metadata: { status: body.status } });
    return review;
  }
}

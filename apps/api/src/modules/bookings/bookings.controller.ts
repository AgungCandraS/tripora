import { Body, Controller, Get, Param, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Request } from "express";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { OptionalAuth, Public } from "../../common/decorators/auth.decorators";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { BookingsService } from "./bookings.service";
import {
  CancelBookingDto,
  CreateBookingDto,
  PricePreviewDto,
} from "./dto/create-booking.dto";

@ApiTags("bookings")
@Controller("bookings")
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @OptionalAuth()
  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async create(@Body() dto: CreateBookingDto, @CurrentUser() user?: AuthUser) {
    return this.bookings.create(dto, user?.id ?? null);
  }

  @Public()
  @Post("price-preview")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async pricePreview(@Body() dto: PricePreviewDto) {
    return this.bookings.pricePreview(dto);
  }

  @Public()
  @Post(":bookingCode/cancel")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async cancel(
    @Param("bookingCode") code: string,
    @Body() dto: CancelBookingDto,
  ) {
    return this.bookings.cancel(code.toUpperCase(), dto.emailOrPhone);
  }

  @Get(":bookingCode")
  @ApiBearerAuth()
  async get(@Param("bookingCode") code: string, @CurrentUser() user: AuthUser) {
    return this.bookings.getByCode(code.toUpperCase(), user);
  }
}

@ApiTags("booking-lookup")
@Controller("booking-lookup")
export class BookingLookupController {
  constructor(private readonly bookings: BookingsService) {}

  @Public()
  @Post()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async lookup(@Body() body: { bookingCode: string; emailOrPhone: string }) {
    return this.bookings.lookup(
      body.bookingCode.toUpperCase(),
      body.emailOrPhone,
    );
  }
}

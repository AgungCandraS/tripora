import { Body, Controller, Post, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { Inject } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Request } from "express";
import { Redis } from "ioredis";
import { Public } from "../../common/decorators/auth.decorators";
import { REDIS_CLIENT } from "../../redis/redis.constants";
import { ReservationsService } from "./reservations.service";
import { CreateReservationDto } from "./dto/create-reservation.dto";

@ApiTags("reservations")
@Controller("reservations")
export class ReservationsController {
  constructor(
    private readonly reservations: ReservationsService,
    private readonly config: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis
  ) {}

  @Post()
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async create(@Body() dto: CreateReservationDto, @Req() req: Request) {
    const result = await this.reservations.create(dto);

    // Redis hold cache — optimization only. Postgres reservations table is the source of truth.
    try {
      if (this.redis.status !== "ready") await this.redis.connect();
      const holdMinutes = this.config.get<number>("RESERVATION_HOLD_MINUTES", 10);
      const token = result.publicToken;
      await this.redis.set(`hold:${token}`, JSON.stringify({ packageId: dto.packageId, scheduleId: dto.scheduleId, participants: dto.participants }), "PX", holdMinutes * 60 * 1000);
    } catch {
      // Redis unavailable -> proceed; Postgres holds the canonical reservation.
    }
    return result;
  }
}

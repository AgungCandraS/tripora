import { Body, Controller, ForbiddenException, Get, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { Throttle } from "@nestjs/throttler";
import { Public } from "../../common/decorators/auth.decorators";
import { PaymentsService } from "./payments.service";

@ApiTags("payments")
@Controller("payments")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post()
  @ApiBearerAuth()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async create(@Body() body: { bookingCode: string }) {
    return this.payments.create(body.bookingCode);
  }

  @Public()
  @Post("simulate")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async simulate(@Body() body: { bookingCode: string }) {
    return this.payments.simulate(body.bookingCode);
  }

  @Get(":id")
  @ApiBearerAuth()
  async get(@Param("id") id: string) {
    const row = await this.payments.find(id);
    return row;
  }
}

@ApiTags("webhooks")
@Controller("webhooks")
export class WebhooksController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly config: ConfigService
  ) {}

  /**
   * Token webhook milik kita (Mayar tidak memberi token): jika
   * MAYAR_WEBHOOK_SECRET diisi, request wajib membawa ?key= yang sama persis.
   * Daftarkan URL lengkap .../webhooks/mayar?key=TOKEN di dashboard Mayar.
   */
  private assertToken(key?: string) {
    const secret = this.config.get<string>("MAYAR_WEBHOOK_SECRET", "");
    if (secret && key !== secret) {
      throw new ForbiddenException({ code: "FORBIDDEN", message: "Invalid webhook token" });
    }
  }

  @Public()
  @Post("mayar")
  async mayar(@Body() payload: unknown, @Query("key") key?: string) {
    this.assertToken(key);
    return this.payments.handleWebhook(payload);
  }
}

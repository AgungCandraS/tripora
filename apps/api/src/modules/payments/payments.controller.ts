import { Body, Controller, ForbiddenException, Get, Param, Post, Query, Req } from "@nestjs/common";
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
   * Token webhook DARI dashboard Mayar (kolom webhook di menu Integration).
   * Simpan di MAYAR_WEBHOOK_TOKEN. Karena Mayar tidak mendokumentasikan
   * letak kirimnya, token diterima dari beberapa lokasi umum (query, header,
   * atau field body) — salah satu harus cocok persis. Kosong = tanpa cek token.
   */
  private assertToken(
    queryToken?: string,
    headers?: Record<string, string | string[] | undefined>,
    body?: unknown
  ) {
    const expected = this.config.get<string>("MAYAR_WEBHOOK_TOKEN", "");
    if (!expected) return;
    const headerOf = (name: string) => {
      const v = headers?.[name] ?? headers?.[name.toLowerCase()];
      const s = Array.isArray(v) ? v[0] : v;
      return typeof s === "string" ? s.replace(/^Bearer\s+/i, "") : undefined;
    };
    const root = (body ?? {}) as Record<string, unknown>;
    const data = (root.data ?? {}) as Record<string, unknown>;
    const candidates = [
      queryToken,
      root.token,
      root.webhookToken,
      root.webhook_token,
      data.token,
      headerOf("x-webhook-token"),
      headerOf("x-mayar-token"),
      headerOf("authorization"),
    ].filter((v): v is string => typeof v === "string" && v.length > 0);
    if (!candidates.includes(expected)) {
      throw new ForbiddenException({ code: "FORBIDDEN", message: "Invalid webhook token" });
    }
  }

  @Public()
  @Post("mayar")
  async mayar(
    @Body() payload: unknown,
    @Query("token") token?: string,
    @Query("key") key?: string,
    @Req() req?: { headers?: Record<string, string | string[] | undefined> }
  ) {
    this.assertToken(token ?? key, req?.headers, payload);
    return this.payments.handleWebhook(payload);
  }
}

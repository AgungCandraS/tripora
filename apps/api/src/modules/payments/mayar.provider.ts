import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  PaymentGatewayCreateInput,
  PaymentGatewayCreateResult,
  PaymentGatewayProvider,
  PaymentGatewayWebhookPayload,
} from "./payment-gateway.interface";

/**
 * Mayar provider (mayar.co.id) — primary gateway per PRD §14 (updated).
 * Server-to-server verification via webhook history is used since Mayar does not
 * document an HMAC header; event identity + amount are cross-checked.
 */
@Injectable()
export class MayarProvider implements PaymentGatewayProvider {
  readonly name = "mayar";

  constructor(private readonly config: ConfigService) {}

  async createPayment(
    input: PaymentGatewayCreateInput,
  ): Promise<PaymentGatewayCreateResult> {
    const apiKey = this.config.get<string>("MAYAR_API_KEY");
    if (!apiKey)
      throw new BadRequestException({
        code: "PAYMENT_FAILED",
        message: "MAYAR_API_KEY is not configured",
      });

    const base = this.config.get<string>(
      "MAYAR_API_BASE",
      "https://api.mayar.id",
    );
    const expiredAt = (
      input.expiresAt ??
      new Date(Date.now() + (input.expiryMinutes ?? 30) * 60 * 1000)
    ).toISOString();

    const res = await fetch(`${base}/hl/v2/invoices/create`, {
      method: "POST",
      signal: AbortSignal.timeout(12000),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: input.customerName,
        email: input.customerEmail,
        mobile: input.customerPhone,
        description: input.description,
        redirectUrl: `${this.config.get<string>("WEB_PUBLIC_BASE_URL", "http://localhost:3000")}/payment/${encodeURIComponent(input.bookingCode)}`,
        expiredAt,
        items: [
          {
            quantity: 1,
            rate: input.amount,
            description: `Booking ${input.bookingCode}`,
          },
        ],
        extraData: {
          bookingId: input.bookingId,
          bookingCode: input.bookingCode,
          noCustomer: input.bookingId,
          idProd: input.bookingId,
        },
      }),
    });

    const json = (await res.json()) as {
      statusCode?: number;
      data?: {
        id?: string;
        transactionId?: string;
        link?: string;
        expiredAt?: number;
      };
    };
    if (!res.ok || !json.data?.link || !json.data.transactionId) {
      throw new BadRequestException({
        code: "PAYMENT_FAILED",
        message: "Mayar invoice creation failed",
      });
    }

    return {
      provider: this.name,
      providerReference: json.data.transactionId,
      paymentUrl: json.data.link,
      expiresAt: json.data.expiredAt
        ? new Date(json.data.expiredAt)
        : new Date(expiredAt),
    };
  }

  /**
   * Verifies a webhook by cross-checking the event against Mayar's server-side webhook
   * history (server-to-server verification), returning a normalized result.
   */
  async verifyAndNormalizeWebhook(payload: PaymentGatewayWebhookPayload) {
    const apiKey = this.config.get<string>("MAYAR_API_KEY");
    const event = payload.event;
    const data = (payload.data ?? {}) as Record<string, unknown>;
    const eventId = String(data.id ?? "");
    const providerReference = String(data.transactionId ?? "");
    const amount =
      typeof data.amount === "number"
        ? data.amount
        : typeof data.amount === "string" && data.amount.trim()
          ? Number(data.amount)
          : NaN;
    // Status pembayaran menurut Mayar: contoh payload resmi memakai
    // status "SUCCESS" + transactionStatus "paid" untuk pembayaran sukses.
    const txStatus = String(data.transactionStatus ?? "");
    const payStatus = String(data.status ?? "");

    if (!eventId || event !== "payment.received") {
      throw new BadRequestException({
        code: "PAYMENT_FAILED",
        message: "Unsupported webhook event",
      });
    }
    if (!providerReference || !Number.isFinite(amount) || amount < 0)
      throw new BadRequestException({
        code: "PAYMENT_FAILED",
        message: "Invalid payment reference or amount",
      });

    // Fail-open verification is a security hole, so verification is strict:
    // non-production may set MAYAR_SKIP_WEBHOOK_VERIFY=true for local testing,
    // but in production that setting is rejected outright.
    const skipVerify =
      this.config.get<string>("MAYAR_SKIP_WEBHOOK_VERIFY", "false") === "true";
    const nodeEnv = this.config.get<string>("NODE_ENV", "development");
    if (skipVerify && nodeEnv === "production") {
      throw new BadRequestException({
        code: "PAYMENT_FAILED",
        message: "Webhook verification bypass is forbidden in production",
      });
    }

    if (!skipVerify) {
      if (!apiKey) {
        throw new BadRequestException({
          code: "PAYMENT_FAILED",
          message: "MAYAR_API_KEY is not configured",
        });
      }
      // Cross-check against Mayar webhook history to verify authenticity.
      const base = this.config.get<string>(
        "MAYAR_API_BASE",
        "https://api.mayar.id",
      );
      let verified = false;
      try {
        const history = await fetch(
          `${base}/hl/v2/webhooks/new-history?limit=50`,
          {
            signal: AbortSignal.timeout(8000),
            headers: { Authorization: `Bearer ${apiKey}` },
          },
        );
        if (history.ok) {
          const json = (await history.json()) as {
            data?: Array<{ payload?: string | PaymentGatewayWebhookPayload }>;
          };
          verified =
            json.data?.some((entry) => {
              try {
                const recorded =
                  typeof entry.payload === "string"
                    ? (JSON.parse(
                        entry.payload,
                      ) as PaymentGatewayWebhookPayload)
                    : entry.payload;
                const detail = recorded?.data;
                return (
                  recorded?.event === event &&
                  detail?.id === eventId &&
                  detail.transactionId === providerReference &&
                  Number(detail.amount) === amount &&
                  detail.status === payStatus &&
                  detail.transactionStatus === txStatus
                );
              } catch {
                return false;
              }
            }) ?? false;
        }
      } catch {
        verified = false;
      }
      if (!verified) {
        throw new BadRequestException({
          code: "PAYMENT_FAILED",
          message: "Webhook could not be verified server-side",
        });
      }
    }

    // Hanya pembayaran lunas yang boleh confirm booking. Event lain dicatat
    // (persist di payment_events oleh service) tanpa perubahan state.
    const paid = txStatus === "paid" && payStatus === "SUCCESS";
    return {
      providerEventId: eventId,
      eventType: event,
      providerReference,
      amount,
      status: paid ? "PAID" : "PENDING",
      raw: payload,
    };
  }
}

export interface PaymentGatewayCreateInput {
  bookingId: string;
  bookingCode: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  amount: number;
  description: string;
  expiryMinutes?: number;
}

export interface PaymentGatewayCreateResult {
  provider: string;
  providerReference?: string;
  paymentUrl: string;
  expiresAt?: Date;
}

export interface PaymentGatewayWebhookPayload {
  event: string;
  data: Record<string, unknown>;
}

/** Abstraction layer so another provider (e.g. Mayar, Xendit) can be added without changing callers. */
export interface PaymentGatewayProvider {
  readonly name: string;
  createPayment(input: PaymentGatewayCreateInput): Promise<PaymentGatewayCreateResult>;
  /** Return a stable unique id for the event, or throw if signature verification fails. */
  verifyAndNormalizeWebhook(payload: PaymentGatewayWebhookPayload): Promise<{
    providerEventId: string;
    eventType: string;
    providerReference?: string;
    amount?: number;
    status?: "PAID" | "PENDING" | "FAILED" | "REFUNDED" | string;
    raw: unknown;
  }>;
}

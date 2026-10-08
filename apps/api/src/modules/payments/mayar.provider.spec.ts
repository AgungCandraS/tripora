import { MayarProvider } from "./mayar.provider";

function fakeConfig(values: Record<string, string> = {}) {
  return {
    get: (key: string, def?: string) => (values[key] ?? def ?? "") as string,
  } as unknown as import("@nestjs/config").ConfigService;
}

const BASE = {
  MAYAR_API_KEY: "test-key",
  MAYAR_API_BASE: "https://api.mayar.id",
  NODE_ENV: "development",
};

function paidPayload(extra: Record<string, unknown> = {}) {
  return {
    event: "payment.received",
    data: {
      id: "evt-1",
      transactionId: "txn-1",
      amount: 185000,
      status: "SUCCESS",
      transactionStatus: "paid",
      ...extra,
    },
  } as never;
}

describe("MayarProvider webhook", () => {
  test("paid + history match → PAID", async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        data: [{ payload: JSON.stringify(paidPayload()) }],
      }),
    })) as unknown as typeof fetch;
    const r = await new MayarProvider(
      fakeConfig(BASE),
    ).verifyAndNormalizeWebhook(paidPayload());
    expect(r.status).toBe("PAID");
    expect(r.providerReference).toBe("txn-1");
    expect(r.amount).toBe(185000);
  });

  test("event tanpa status paid → PENDING (dicatat, tanpa confirm)", async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        data: [
          {
            payload: JSON.stringify(
              paidPayload({ status: "PENDING", transactionStatus: "created" }),
            ),
          },
        ],
      }),
    })) as unknown as typeof fetch;
    const r = await new MayarProvider(
      fakeConfig(BASE),
    ).verifyAndNormalizeWebhook(
      paidPayload({ status: "PENDING", transactionStatus: "created" }),
    );
    expect(r.status).toBe("PENDING");
  });

  test("event tak dikenal di history → ditolak", async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ data: [] }),
    })) as unknown as typeof fetch;
    await expect(
      new MayarProvider(fakeConfig(BASE)).verifyAndNormalizeWebhook(
        paidPayload(),
      ),
    ).rejects.toThrow(
      expect.objectContaining({
        response: expect.objectContaining({ code: "PAYMENT_FAILED" }),
      }),
    );
  });

  test("event bukan payment.received → ditolak tanpa fetch", async () => {
    const spy = jest.fn();
    global.fetch = spy as unknown as typeof fetch;
    await expect(
      new MayarProvider(fakeConfig(BASE)).verifyAndNormalizeWebhook({
        event: "payment.reminder",
        data: {},
      } as never),
    ).rejects.toThrow(/Unsupported webhook event/);
    expect(spy).not.toHaveBeenCalled();
  });

  test("skip-verify dev lolos, production ditolak", async () => {
    const dev = new MayarProvider(
      fakeConfig({ ...BASE, MAYAR_SKIP_WEBHOOK_VERIFY: "true" }),
    );
    const r = await dev.verifyAndNormalizeWebhook({
      event: "payment.received",
      data: { id: "e", transactionId: "t", amount: 1000 },
    } as never);
    expect(r.status).toBe("PENDING");
    const prod = new MayarProvider(
      fakeConfig({
        ...BASE,
        NODE_ENV: "production",
        MAYAR_SKIP_WEBHOOK_VERIFY: "true",
      }),
    );
    await expect(prod.verifyAndNormalizeWebhook(paidPayload())).rejects.toThrow(
      /forbidden in production/,
    );
  });

  test("an event id cannot authenticate a changed transaction or amount", async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        data: [{ id: "evt-1", payload: JSON.stringify(paidPayload()) }],
      }),
    })) as unknown as typeof fetch;
    const provider = new MayarProvider(fakeConfig(BASE));
    await expect(
      provider.verifyAndNormalizeWebhook(
        paidPayload({ transactionId: "attacker-invoice" }),
      ),
    ).rejects.toThrow(/could not be verified/);
    await expect(
      provider.verifyAndNormalizeWebhook(paidPayload({ amount: 1 })),
    ).rejects.toThrow(/could not be verified/);
  });

  test.each([undefined, null, "", "NaN", Infinity])(
    "rejects invalid amount %p",
    async (amount) => {
      await expect(
        new MayarProvider(
          fakeConfig({ ...BASE, MAYAR_SKIP_WEBHOOK_VERIFY: "true" }),
        ).verifyAndNormalizeWebhook(paidPayload({ amount })),
      ).rejects.toThrow(/Invalid payment/);
    },
  );
});

import { randomUUID } from "crypto";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { allocation } from "../../common/utils/inventory";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { AuditService } from "../audit/audit.service";
import { AvailabilityService } from "../availability/availability.service";
import { ReservationsService } from "../reservations/reservations.service";
import { SettingsService } from "../settings/settings.service";
import { PromotionsService } from "../promotions/promotions.service";
import { TicketsService } from "../tickets/tickets.service";
import { NotificationsProducer } from "../notifications/notifications-producer.service";
import { MayarProvider } from "../payments/mayar.provider";
import { PaymentsService } from "../payments/payments.service";
import { CheckinsController } from "../checkins/checkins.controller";
import { RefundsController } from "../refunds/refunds.controller";
import {
  AdminPayoutsController,
  VendorPayoutsController,
} from "../payouts/payouts.controller";
import { SearchController } from "../search/search.controller";
import { BookingsService } from "./bookings.service";

// Opt in with TEST_DATABASE_URL pointing to an isolated database; no production cleanup.
jest.setTimeout(30000);
const run = process.env.TEST_DATABASE_URL ? describe : describe.skip;
run("booking lifecycle against PostgreSQL", () => {
  const prisma = new PrismaService({
    datasources: { db: { url: process.env.TEST_DATABASE_URL } },
  });
  const config = new ConfigService({
    JWT_ACCESS_SECRET: "integration-secret",
    PAYMENT_PROVIDER: "mayar",
  });
  const audit = new AuditService(prisma);
  const settings = new SettingsService(prisma, config, audit);
  const availability = new AvailabilityService(prisma);
  const reservations = new ReservationsService(
    prisma,
    availability,
    config,
    settings,
  );
  const tickets = new TicketsService(prisma, config);
  const bookings = new BookingsService(
    prisma,
    config,
    availability,
    new PromotionsService(prisma),
    settings,
    tickets,
    audit,
  );
  const provider = {
    name: "mayar",
    createPayment: jest.fn(
      async (input: { bookingId: string; expiresAt: Date }) => ({
        provider: "mayar",
        providerReference: input.bookingId,
        paymentUrl: `https://example.test/pay/${input.bookingId}`,
        expiresAt: input.expiresAt,
      }),
    ),
    verifyAndNormalizeWebhook: jest.fn(
      async (payload: {
        data: { id: string; transactionId: string; amount: number };
      }) => ({
        providerEventId: payload.data.id,
        providerReference: payload.data.transactionId,
        amount: payload.data.amount,
        eventType: "payment.received",
        status: "PAID",
        raw: payload,
      }),
    ),
  };
  const payments = new PaymentsService(
    prisma,
    config,
    settings,
    provider as unknown as MayarProvider,
    tickets,
    {} as NotificationsProducer,
    audit,
  );

  beforeAll(async () => {
    const url = new URL(process.env.TEST_DATABASE_URL!);
    if (!url.pathname.includes("test"))
      throw new Error("Integration tests require a dedicated test database");
    await prisma.$connect();
  });
  afterAll(async () => prisma.$disconnect());
  beforeEach(() => {
    jest.restoreAllMocks();
    provider.createPayment.mockClear();
  });

  async function fixture(capacity = 10) {
    const suffix = randomUUID();
    const owner = await prisma.user.create({
      data: { full_name: "Integration owner", email: `${suffix}@example.test` },
    });
    const vendor = await prisma.vendor.create({
      data: {
        owner_user_id: owner.id,
        name: "Integration partner",
        slug: suffix,
        status: "APPROVED",
      },
    });
    const region = await prisma.region.create({
      data: {
        name: "Integration region",
        slug: suffix,
        province: "Jawa Barat",
      },
    });
    const destination = await prisma.destination.create({
      data: { name: "Integration Bandung", slug: suffix, region_id: region.id },
    });
    const activity = await prisma.activity.create({
      data: {
        title: "Integration paddle trip",
        slug: suffix,
        vendor_id: vendor.id,
        destination_id: destination.id,
        status: "PUBLISHED",
      },
    });
    const pkg = await prisma.package.create({
      data: {
        activity_id: activity.id,
        name: "Paddle",
        base_price: 100000,
        min_participants: 1,
        max_participants: 20,
        booking_cutoff_minutes: 0,
      },
    });
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + 15);
    date.setUTCHours(0, 0, 0, 0);
    const schedule = await prisma.schedule.create({
      data: {
        package_id: pkg.id,
        specific_date: date,
        start_time: "10:00",
        end_time: "12:00",
        capacity,
      },
    });
    const user: AuthUser = {
      id: owner.id,
      email: owner.email,
      roles: ["VENDOR_OWNER"],
      vendorId: vendor.id,
    };
    return { owner, vendor, destination, activity, pkg, schedule, date, user };
  }
  type Fixture = Awaited<ReturnType<typeof fixture>>;
  async function hold(f: Fixture, participants = 1) {
    const sessionId = randomUUID();
    const row = await reservations.create({
      packageId: f.pkg.id,
      scheduleId: f.schedule.id,
      date: f.date.toISOString().slice(0, 10),
      participants,
      sessionId,
    });
    return { ...row, sessionId };
  }
  async function book(f: Fixture, participants = 1, promo?: string) {
    const reservation = await hold(f, participants);
    const unique = randomUUID();
    const result = await bookings.create(
      {
        reservationId: reservation.reservationId,
        sessionId: reservation.sessionId,
        booker: {
          name: "Integration Guest",
          email: `${unique}@example.test`,
          phone: `08${String(Date.now()).slice(-10)}`,
        },
        promotionCode: promo,
      },
      f.owner.id,
    );
    return result;
  }
  async function paid(f: Fixture, participants = 1) {
    const booking = await book(f, participants);
    await payments.create(
      booking.booking_code,
      undefined,
      booking.guestAccessToken,
    );
    await payments.handleWebhook({
      data: {
        id: randomUUID(),
        transactionId: booking.id,
        amount: booking.total_amount,
      },
    });
    return booking;
  }

  test("two concurrent holds cannot oversell; counts participants", async () => {
    const f = await fixture(3);
    const result = await Promise.allSettled([hold(f, 2), hold(f, 2)]);
    expect(result.filter((row) => row.status === "fulfilled")).toHaveLength(1);
    expect((await allocation(prisma, f.schedule.id, f.date)).held).toBe(2);
  });

  test("booking consumes participants, preserves owner, and excludes platform fee from vendor net", async () => {
    const f = await fixture();
    const booking = await book(f, 3);
    expect(await allocation(prisma, f.schedule.id, f.date)).toEqual({
      booked: 3,
      held: 0,
    });
    await expect(hold(f, 8)).rejects.toThrow(/no longer available/);
    expect(
      (await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } }))
        .user_id,
    ).toBe(f.owner.id);
    expect(booking.total_amount).toBe(305000);
    expect(booking.vendor_net_amount).toBe(270000);
    expect(new Date(booking.paymentExpiresAt).getTime()).toBeGreaterThan(
      Date.now(),
    );
  });

  test("wrong package, inactive schedule, and calendar mismatch are rejected", async () => {
    const f = await fixture();
    const other = await prisma.package.create({
      data: { activity_id: f.activity.id, name: "Other", base_price: 1 },
    });
    await expect(
      reservations.create({
        packageId: other.id,
        scheduleId: f.schedule.id,
        date: f.date.toISOString().slice(0, 10),
        participants: 1,
      }),
    ).rejects.toThrow(/does not belong/);
    const otherDate = new Date(f.date);
    otherDate.setUTCDate(otherDate.getUTCDate() + 1);
    await expect(
      reservations.create({
        packageId: f.pkg.id,
        scheduleId: f.schedule.id,
        date: otherDate.toISOString().slice(0, 10),
        participants: 1,
      }),
    ).rejects.toThrow(/unavailable/);
    await prisma.schedule.update({
      where: { id: f.schedule.id },
      data: { status: "PAUSED" },
    });
    await expect(hold(f)).rejects.toThrow(/unavailable/);
  });

  test("expiry is rechecked after the initial reservation read", async () => {
    const f = await fixture();
    const reservation = await hold(f);
    const original = availability.slotGuard.bind(availability);
    jest
      .spyOn(availability, "slotGuard")
      .mockImplementationOnce(async (...args) => {
        await prisma.reservation.update({
          where: { id: reservation.reservationId },
          data: { expires_at: new Date(0) },
        });
        return original(...args);
      });
    await expect(
      bookings.create(
        {
          reservationId: reservation.reservationId,
          sessionId: reservation.sessionId,
          booker: {
            name: "Test Guest",
            email: `${randomUUID()}@example.test`,
            phone: "081234567890",
          },
        },
        null,
      ),
    ).rejects.toThrow(/no longer active/);
  });

  test("voucher usage references the created booking and cannot exceed subtotal", async () => {
    const f = await fixture();
    const code = `TEST-${randomUUID()}`;
    await prisma.promotion.create({
      data: {
        code,
        type: "NOMINAL",
        value: 900000,
        usage_limit: 1,
        vendor_id: f.vendor.id,
      },
    });
    const booking = await book(f, 1, code);
    expect(booking.discount_amount).toBe(100000);
    expect(booking.total_amount).toBe(5000);
    expect(booking.vendor_net_amount).toBe(0);
    expect(
      await prisma.promotionUsage.count({ where: { booking_id: booking.id } }),
    ).toBe(1);
    await expect(book(f, 1, code)).rejects.toThrow(/Quota exhausted/);
  });

  test("guest ownership is required; concurrent invoice retries reuse one invoice", async () => {
    const f = await fixture();
    const booking = await book(f);
    await expect(payments.create(booking.booking_code)).rejects.toThrow(
      /ownership/,
    );
    await expect(
      payments.create(booking.booking_code, randomUUID()),
    ).rejects.toThrow(/ownership/);
    const results = await Promise.all([
      payments.create(
        booking.booking_code,
        undefined,
        booking.guestAccessToken,
      ),
      payments.create(
        booking.booking_code,
        undefined,
        booking.guestAccessToken,
      ),
    ]);
    expect(results[0].paymentId).toBe(results[1].paymentId);
    expect(provider.createPayment).toHaveBeenCalledTimes(1);
  });

  test("webhook effects roll back together, then retry confirms exactly once", async () => {
    const f = await fixture();
    const booking = await book(f);
    await payments.create(
      booking.booking_code,
      undefined,
      booking.guestAccessToken,
    );
    const payload = {
      data: {
        id: randomUUID(),
        transactionId: booking.id,
        amount: booking.total_amount,
      },
    };
    jest
      .spyOn(tickets, "issueForBooking")
      .mockRejectedValueOnce(new Error("Injected ticket failure"));
    await expect(payments.handleWebhook(payload)).rejects.toThrow(/Injected/);
    expect(
      await prisma.paymentEvent.count({
        where: { provider_event_id: payload.data.id },
      }),
    ).toBe(0);
    expect(
      (
        await prisma.payment.findUniqueOrThrow({
          where: { booking_id: booking.id },
        })
      ).status,
    ).toBe("PENDING");
    const result = await Promise.all([
      payments.handleWebhook(payload),
      payments.handleWebhook(payload),
    ]);
    expect(result.filter((row) => row.idempotent)).toHaveLength(1);
    expect(
      await prisma.ticket.count({ where: { booking_id: booking.id } }),
    ).toBe(1);
    expect(
      await prisma.notification.count({
        where: { booking_id: booking.id, status: "QUEUED" },
      }),
    ).toBe(1);
  });

  test("an old unprocessed event is recoverable", async () => {
    const f = await fixture();
    const booking = await book(f);
    const invoice = await payments.create(
      booking.booking_code,
      undefined,
      booking.guestAccessToken,
    );
    const payload = {
      data: {
        id: randomUUID(),
        transactionId: booking.id,
        amount: booking.total_amount,
      },
    };
    await prisma.paymentEvent.create({
      data: {
        payment_id: invoice.paymentId,
        provider_event_id: payload.data.id,
        event_type: "payment.received",
        raw_payload: payload,
      },
    });
    await payments.handleWebhook(payload);
    expect(
      (await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } }))
        .status,
    ).toBe("CONFIRMED");
  });

  test("late payment creates refund review without reallocating capacity or issuing ticket", async () => {
    const f = await fixture();
    const booking = await book(f);
    await payments.create(
      booking.booking_code,
      undefined,
      booking.guestAccessToken,
    );
    await prisma.payment.update({
      where: { booking_id: booking.id },
      data: { expires_at: new Date(0), status: "EXPIRED" },
    });
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "EXPIRED" },
    });
    await payments.handleWebhook({
      data: {
        id: randomUUID(),
        transactionId: booking.id,
        amount: booking.total_amount,
      },
    });
    expect(
      await prisma.ticket.count({ where: { booking_id: booking.id } }),
    ).toBe(0);
    expect(
      await prisma.refund.count({
        where: { booking_id: booking.id, status: "PENDING" },
      }),
    ).toBe(1);
    expect((await allocation(prisma, f.schedule.id, f.date)).booked).toBe(0);
    const refund = await prisma.refund.findFirstOrThrow({
      where: { booking_id: booking.id },
    });
    const refunds = new RefundsController(prisma);
    await refunds.approve(refund.id, f.user);
    await refunds.process(refund.id, f.user, { reference: "TEST-LATE-REFUND" });
    expect(
      (
        await new VendorPayoutsController(
          prisma,
          config,
          settings,
          audit,
        ).balance(f.user)
      ).available,
    ).toBe(0);
  });

  test("concurrent check-in uses ticket once and commits booking state", async () => {
    const f = await fixture();
    const booking = await paid(f);
    const checkins = new CheckinsController(prisma, tickets, audit);
    const token = await tickets.getPublicToken(booking.id);
    const result = await Promise.allSettled([
      checkins.scan({ token }, f.user),
      checkins.scan({ token }, f.user),
    ]);
    expect(result.filter((row) => row.status === "fulfilled")).toHaveLength(1);
    expect(
      (await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } }))
        .status,
    ).toBe("CHECKED_IN");
  });

  test("refund approval waits for transfer; rejection restores original state", async () => {
    const f = await fixture();
    const booking = await paid(f);
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "COMPLETED" },
    });
    const refunds = new RefundsController(prisma);
    const first = await refunds.request(
      { bookingId: booking.id, reason: "Test cancellation" },
      f.user,
    );
    await refunds.reject(first.id, f.user);
    expect(
      (await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } }))
        .status,
    ).toBe("COMPLETED");
    const next = await refunds.request(
      { bookingId: booking.id, reason: "Test cancellation" },
      f.user,
    );
    await refunds.approve(next.id, f.user);
    expect(
      (
        await prisma.payment.findUniqueOrThrow({
          where: { booking_id: booking.id },
        })
      ).status,
    ).toBe("PAID");
    await expect(refunds.process(next.id, f.user, {})).rejects.toThrow(
      /reference/,
    );
    await refunds.process(next.id, f.user, { reference: "TEST-TRANSFER" });
    expect(
      (
        await prisma.ticket.findUniqueOrThrow({
          where: { booking_id: booking.id },
        })
      ).status,
    ).toBe("VOID");
  });

  test("retained partial-refund balance can settle after the transfer is recorded", async () => {
    const f = await fixture();
    const booking = await paid(f, 2);
    await prisma.booking.update({
      where: { id: booking.id },
      data: { booking_date: new Date(Date.now() + 4 * 86400000) },
    });
    const refunds = new RefundsController(prisma);
    const refund = await refunds.request(
      { bookingId: booking.id, reason: "Partial cancellation" },
      f.user,
    );
    expect(refund.vendor_liability).toBe(90000);
    const vendor = new VendorPayoutsController(prisma, config, settings, audit);
    expect((await vendor.balance(f.user)).available).toBe(0);
    await refunds.approve(refund.id, f.user);
    await refunds.process(refund.id, f.user, {
      reference: "TEST-PARTIAL-REFUND",
    });
    expect((await vendor.balance(f.user)).available).toBe(90000);
    const payout = await vendor.request(f.user);
    await new AdminPayoutsController(prisma, audit).process(f.user, payout.id, {
      reference: "TEST-PARTIAL-PAYOUT",
    });
    expect((await vendor.balance(f.user)).available).toBe(0);
  });

  test("payout reserves only paid completed earnings and releases only its own rows", async () => {
    const f = await fixture();
    const vendor = new VendorPayoutsController(prisma, config, settings, audit);
    const admin = new AdminPayoutsController(prisma, audit);
    const unpaid = await book(f);
    expect((await vendor.balance(f.user)).available).toBe(0);
    const eligible = await paid(f);
    await prisma.booking.update({
      where: { id: eligible.id },
      data: { status: "COMPLETED" },
    });
    const payout = await vendor.request(f.user);
    expect(payout.amount).toBe(90000);
    expect((await vendor.balance(f.user)).available).toBe(0);
    const later = await paid(f);
    await prisma.booking.update({
      where: { id: later.id },
      data: { status: "COMPLETED" },
    });
    await expect(admin.process(f.user, payout.id, {})).rejects.toThrow(
      /reference/,
    );
    await admin.process(f.user, payout.id, { reference: "TEST-BANK" });
    expect(
      (
        await prisma.vendorEarning.findUniqueOrThrow({
          where: { booking_id: later.id },
        })
      ).settlement_status,
    ).toBe("PENDING");
    expect(
      (
        await prisma.vendorEarning.findUniqueOrThrow({
          where: { booking_id: unpaid.id },
        })
      ).settlement_status,
    ).toBe("PENDING");
    expect((await vendor.balance(f.user)).available).toBe(90000);
  });

  test("keyword and price filters combine, total precedes pagination, quantity filters availability", async () => {
    const f = await fixture(2);
    const search = new SearchController(prisma, availability);
    const query = {
      q: "paddle",
      destination: f.destination.slug,
      min_price: "90000",
      max_price: "110000",
    };
    expect((await search.search(query)).total).toBe(1);
    expect(
      (await search.search({ ...query, page: "2" })).activities,
    ).toHaveLength(0);
    expect((await search.search({ ...query, max_price: "95000" })).total).toBe(
      0,
    );
    expect(
      (
        await search.search({
          ...query,
          date: f.date.toISOString().slice(0, 10),
          guests: "3",
        })
      ).total,
    ).toBe(0);
    await expect(search.search({ page: "1.5" })).rejects.toThrow(
      /Invalid page/,
    );
  });
});

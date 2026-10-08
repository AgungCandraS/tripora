const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const places = require("../apps/web/data/places.json");

const web = process.env.TEST_WEB_URL ?? "http://localhost:3000";
const api = process.env.TEST_API_URL ?? "http://localhost:4000/api/v1";
const checks = [];
async function request(path, method = "GET", body, cookie = "") {
  const response = await fetch(`${api}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  return { response, data: result.data, result };
}

async function main() {
  for (const path of [
    "/",
    "/explore",
    "/saved",
    "/destinations",
    "/destinations/lembang",
    `/places/${places[0].slug}`,
    "/checkout",
    "/checkout?date=2026-02-31",
    "/auth/login",
    "/my-trips",
    "/account",
    "/vendor",
    "/staff",
    "/admin",
    "/payment/UNKNOWN",
  ]) {
    const response = await fetch(`${web}${path}`);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.match(html, /lang="id"/);
    assert.match(html, /Lompat ke konten/);
    assert.doesNotMatch(html, /Internal Server Error/);
  }
  // Next.js can stream the 404 UI with HTTP 200 after the root loading boundary.
  for (const path of ["/places/not-a-place", "/destinations/not-an-area"]) {
    const response = await fetch(`${web}${path}`);
    assert.ok([200, 404].includes(response.status));
    const html = await response.text();
    assert.match(html, /Rute ini tidak ada di peta/);
    assert.match(html, /name="robots" content="noindex"/);
  }
  checks.push(
    "15 pages render; invalid detail routes show missing-page UI and noindex",
  );
  const getPlaces = async (query) =>
    (await fetch(`${web}/api/places?${query}`)).json();
  const catalog = await getPlaces("");
  assert.equal(catalog.total, 998);
  assert.equal(catalog.places.length, 12);
  const next = await getPlaces("page=2");
  assert.equal(next.total, catalog.total);
  assert.ok(
    !next.places.some((place) =>
      catalog.places.some((first) => first.id === place.id),
    ),
  );
  const filtered = await getPlaces("area=Lembang&category=cafe_ngopi");
  assert.ok(filtered.total > 0);
  assert.ok(
    filtered.places.every(
      (place) => place.area === "Lembang" && place.category === "cafe_ngopi",
    ),
  );
  assert.equal((await getPlaces("q=notfoundxyz-unique")).total, 0);
  assert.equal((await getPlaces("ids=")).total, 0);
  assert.equal(
    (await getPlaces(`ids=${encodeURIComponent(places[0].id)}`)).total,
    1,
  );
  const savedResponse = await fetch(`${web}/api/places`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids: places.map((place) => place.id) }),
  });
  assert.equal(savedResponse.status, 200);
  assert.equal((await savedResponse.json()).total, 998);
  assert.equal(
    (
      await fetch(`${web}/api/places`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array(1001).fill("invalid") }),
      })
    ).status,
    400,
  );
  assert.ok(
    places.every(
      (place) =>
        !place.photo ||
        place.photo.startsWith("https://lh3.googleusercontent.com/"),
    ),
  );
  assert.ok(
    places.every(
      (place) =>
        !["price_tier", "open_status", "whatsapp"].some((key) => key in place),
    ),
  );
  checks.push("catalog filtering, pagination, saved IDs and evidence rules");

  const databaseUrl = process.env.TEST_DATABASE_URL;
  if (!databaseUrl) {
    console.log(
      JSON.stringify(
        { passed: checks, apiChecks: "skipped: TEST_DATABASE_URL unset" },
        null,
        2,
      ),
    );
    return;
  }
  assert.ok(
    new URL(databaseUrl).pathname.includes("test"),
    "Only write fixtures to an isolated test database",
  );
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  try {
    assert.equal((await request("/auth/me")).response.status, 401);
    assert.equal((await request("/admin/dashboard")).response.status, 401);
    await prisma.role.upsert({
      where: { code: "CUSTOMER" },
      create: { code: "CUSTOMER", name: "Customer" },
      update: {},
    });
    const password = randomUUID();
    const makeUser = () =>
      prisma.user.create({
        data: {
          full_name: "HTTP Integration Test",
          email: `${randomUUID()}@example.test`,
          email_verified: true,
          password_hash: bcrypt.hashSync(password, 10),
          roles: { create: { role: { connect: { code: "CUSTOMER" } } } },
        },
      });
    const owner = await makeUser();
    const stranger = await makeUser();
    const login = async (user) => {
      const result = await request("/auth/login", "POST", {
        email: user.email,
        password,
      });
      assert.equal(result.response.status, 200);
      const cookies = result.response.headers.getSetCookie();
      assert.ok(
        cookies.some(
          (cookie) =>
            cookie.startsWith("accessToken=") && /HttpOnly/i.test(cookie),
        ),
      );
      return cookies.map((cookie) => cookie.split(";")[0]).join("; ");
    };
    const ownerCookie = await login(owner);
    const strangerCookie = await login(stranger);
    assert.equal(
      (await request("/auth/me", "GET", undefined, ownerCookie)).data.id,
      owner.id,
    );
    assert.equal(
      (await request("/admin/dashboard", "GET", undefined, ownerCookie))
        .response.status,
      403,
    );
    const template = await prisma.activity.findFirstOrThrow({
      where: { status: "PUBLISHED", vendor: { status: "APPROVED" } },
    });
    const pkg = await prisma.package.create({
      data: {
        activity_id: template.id,
        name: "HTTP test package",
        base_price: 100000,
        booking_cutoff_minutes: 0,
      },
    });
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + 20);
    date.setUTCHours(0, 0, 0, 0);
    const schedule = await prisma.schedule.create({
      data: {
        package_id: pkg.id,
        specific_date: date,
        start_time: "10:00",
        end_time: "12:00",
        capacity: 20,
      },
    });
    const sessionId = randomUUID();
    const hold = await request("/reservations", "POST", {
      packageId: pkg.id,
      scheduleId: schedule.id,
      date: date.toISOString().slice(0, 10),
      participants: 2,
      sessionId,
    });
    assert.equal(hold.response.status, 201);
    const created = await request(
      "/bookings",
      "POST",
      {
        reservationId: hold.data.reservationId,
        sessionId,
        booker: {
          name: owner.full_name,
          email: owner.email,
          phone: `08${Date.now().toString().slice(-10)}`,
        },
      },
      ownerCookie,
    );
    assert.equal(created.response.status, 201, JSON.stringify(created.result));
    const booking = await prisma.booking.findUniqueOrThrow({
      where: { id: created.data.id },
    });
    assert.equal(booking.user_id, owner.id);
    assert.equal(
      (
        await request("/me/trips", "GET", undefined, ownerCookie)
      ).data.bookings.filter((row) => row.id === booking.id).length,
      1,
    );
    assert.equal(
      (
        await request(
          `/bookings/${booking.booking_code}`,
          "GET",
          undefined,
          strangerCookie,
        )
      ).response.status,
      403,
    );
    assert.equal(
      (
        await request("/payments", "POST", {
          bookingCode: booking.booking_code,
        })
      ).response.status,
      403,
    );
    const payment = await prisma.payment.update({
      where: { booking_id: booking.id },
      data: {
        provider_reference: randomUUID(),
        payment_url: "https://example.test/payment",
      },
    });
    assert.equal(
      (
        await request(
          `/payments/${payment.id}`,
          "GET",
          undefined,
          strangerCookie,
        )
      ).response.status,
      403,
    );
    assert.equal(
      (await request(`/payments/${payment.id}`, "GET", undefined, ownerCookie))
        .response.status,
      200,
    );
    const ownInvoice = await request(
      "/payments",
      "POST",
      { bookingCode: booking.booking_code },
      ownerCookie,
    );
    assert.equal(ownInvoice.response.status, 201);
    const lookup = await request("/booking-lookup", "POST", {
      bookingCode: booking.booking_code,
      emailOrPhone: owner.email,
    });
    const guestInvoice = await request("/payments", "POST", {
      bookingCode: booking.booking_code,
      guestAccessToken: lookup.data.guestAccessToken,
    });
    assert.equal(guestInvoice.response.status, 201);
    assert.equal(guestInvoice.data.paymentUrl, "https://example.test/payment");
    const invalid = await request("/reservations", "POST", {
      packageId: pkg.id,
      scheduleId: schedule.id,
      date: "2026-02-31",
      participants: 1,
    });
    assert.equal(invalid.response.status, 400);
    const availability = await request(
      `/packages/${pkg.id}/availability?date=${date.toISOString().slice(0, 10)}`,
    );
    assert.equal(availability.response.status, 200);
    assert.equal(availability.data.slots[0].available, 18);
    checks.push(
      "cookie login, optional auth owner attachment, private-role guards, guest payment proof, IDOR rejection and participant capacity over HTTP",
    );
  } finally {
    await prisma.$disconnect();
  }
  console.log(JSON.stringify({ passed: checks }, null, 2));
}
main().catch((error) => {
  console.error(error.stack);
  process.exitCode = 1;
});

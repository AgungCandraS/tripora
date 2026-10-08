// Run after API integration tests and worker build, only against their isolated DB.
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { Client } = require("pg");
const { reconcile } = require("../apps/worker/dist/lifecycle");

async function main() {
  const connectionString = process.env.TEST_DATABASE_URL;
  assert.ok(
    connectionString && new URL(connectionString).pathname.includes("test"),
    "Use an isolated test database",
  );
  const pg = new Client({ connectionString });
  await pg.connect();
  try {
    const template = (
      await pg.query("SELECT id, schedule_id FROM bookings LIMIT 1")
    ).rows[0];
    assert.ok(
      template,
      "Run API integration tests to create test fixtures first",
    );
    async function booking(status, date, scheduleId = template.schedule_id) {
      const id = randomUUID();
      await pg.query(
        `INSERT INTO bookings SELECT (jsonb_populate_record(NULL::bookings, to_jsonb(b) || $2::jsonb)).* FROM bookings b WHERE b.id = $1`,
        [
          template.id,
          JSON.stringify({
            id,
            booking_code: `SWEEP-${id}`,
            user_id: null,
            reservation_id: null,
            status,
            booking_date: date,
            schedule_id: scheduleId,
            created_at: "2020-01-01T00:00:00",
            updated_at: "2020-01-01T00:00:00",
          }),
        ],
      );
      return id;
    }
    const today = new Date().toISOString().slice(0, 10);
    const expired = await booking("PENDING_PAYMENT", today);
    const live = await booking("PENDING_PAYMENT", today);
    for (const [id, expiry] of [
      [expired, "2020-01-01"],
      [live, "2099-01-01"],
    ]) {
      await pg.query(
        "INSERT INTO payments (id, booking_id, provider, amount, status, expires_at) VALUES ($1, $2, 'test', 100000, 'PENDING', $3)",
        [randomUUID(), id, expiry],
      );
    }
    const overnight = randomUUID();
    await pg.query(
      `INSERT INTO schedules SELECT (jsonb_populate_record(NULL::schedules, to_jsonb(s) || $2::jsonb)).* FROM schedules s WHERE s.id = $1`,
      [
        template.schedule_id,
        JSON.stringify({
          id: overnight,
          start_time: "23:00",
          end_time: "01:00",
        }),
      ],
    );
    const past = await booking("CHECKED_IN", "2020-01-01", overnight);
    const future = await booking("CHECKED_IN", "2099-01-01", overnight);
    let queued = 0;
    const queue = {
      getJob: async () => null,
      add: async () => {
        queued++;
      },
    };
    await reconcile(connectionString, queue);
    const rows = (
      await pg.query(
        "SELECT id, status FROM bookings WHERE id = ANY($1::uuid[])",
        [[expired, live, past, future]],
      )
    ).rows;
    const status = (id) => rows.find((row) => row.id === id).status;
    assert.equal(status(expired), "EXPIRED");
    assert.equal(status(live), "PENDING_PAYMENT");
    assert.equal(status(past), "COMPLETED");
    assert.equal(status(future), "CHECKED_IN");
    assert.equal(
      (
        await pg.query("SELECT status FROM payments WHERE booking_id = $1", [
          expired,
        ])
      ).rows[0].status,
      "EXPIRED",
    );
    assert.equal(
      (
        await pg.query(
          "SELECT COUNT(*)::int AS count FROM audit_logs WHERE resource_id = $1 AND resource_type = 'Booking'",
          [expired],
        )
      ).rows[0].count,
      1,
    );
    await reconcile(connectionString, queue);
    assert.equal(
      (
        await pg.query(
          "SELECT COUNT(*)::int AS count FROM audit_logs WHERE resource_id = $1 AND resource_type = 'Booking'",
          [expired],
        )
      ).rows[0].count,
      1,
    );
    console.log(
      JSON.stringify({
        result: "passed",
        paymentExpiry: true,
        deadlineNotCreationTime: true,
        overnightCompletion: true,
        noDuplicateExpiryAudit: true,
        outboxJobsQueued: queued,
      }),
    );
  } finally {
    await pg.end();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

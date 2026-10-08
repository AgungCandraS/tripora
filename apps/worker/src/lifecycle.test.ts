import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { Client } from "pg";
import { deliverNotification } from "./lifecycle";

const databaseUrl = process.env.TEST_DATABASE_URL;
const options = { skip: !databaseUrl };

async function fixture() {
  assert.ok(
    databaseUrl && new URL(databaseUrl).pathname.includes("test"),
    "Use an isolated test database",
  );
  const pg = new Client({ connectionString: databaseUrl });
  await pg.connect();
  const id = randomUUID();
  await pg.query(
    "INSERT INTO notifications (id, channel, template, status, payload) VALUES ($1, 'email', 'email_verification', 'QUEUED', $2)",
    [
      id,
      JSON.stringify({
        type: "email_verification",
        to: "worker@example.test",
        link: "https://example.test/verify",
      }),
    ],
  );
  return {
    pg,
    id,
    status: async () =>
      (
        await pg.query(
          "SELECT status, sent_at FROM notifications WHERE id = $1",
          [id],
        )
      ).rows[0],
  };
}

test("Missing adapter preserves a queued notification", options, async () => {
  const f = await fixture();
  try {
    await assert.rejects(
      deliverNotification(f.id, databaseUrl!, {}),
      /not configured/,
    );
    assert.deepEqual(await f.status(), { status: "QUEUED", sent_at: null });
  } finally {
    await f.pg.end();
  }
});

test(
  "Failed delivery rolls back and a retry can succeed",
  options,
  async () => {
    const f = await fixture();
    const env = { EMAIL_DELIVERY_URL: "https://example.test/mail" };
    try {
      await assert.rejects(
        deliverNotification(
          f.id,
          databaseUrl!,
          env,
          async () => new Response("", { status: 503 }),
        ),
        /503/,
      );
      assert.equal((await f.status()).status, "QUEUED");
      await deliverNotification(
        f.id,
        databaseUrl!,
        env,
        async () => new Response("", { status: 200 }),
      );
      assert.equal((await f.status()).status, "SENT");
      assert.ok((await f.status()).sent_at);
    } finally {
      await f.pg.end();
    }
  },
);

test(
  "Concurrent duplicate jobs deliver once with a stable idempotency key",
  options,
  async () => {
    const f = await fixture();
    let calls = 0;
    const request: typeof fetch = async (_url, init) => {
      calls++;
      assert.equal(new Headers(init?.headers).get("Idempotency-Key"), f.id);
      assert.equal(
        new Headers(init?.headers).get("Authorization"),
        "Bearer test-token",
      );
      assert.equal(JSON.parse(String(init?.body)).to, "worker@example.test");
      return new Response("", { status: 200 });
    };
    try {
      await Promise.all(
        [1, 2, 3].map(() =>
          deliverNotification(
            f.id,
            databaseUrl!,
            {
              EMAIL_DELIVERY_URL: "https://example.test/mail",
              EMAIL_DELIVERY_TOKEN: "test-token",
            },
            request,
          ),
        ),
      );
      assert.equal(calls, 1);
      assert.equal((await f.status()).status, "SENT");
    } finally {
      await f.pg.end();
    }
  },
);

test(
  "Network failure preserves the outbox for later retry",
  options,
  async () => {
    const f = await fixture();
    try {
      await assert.rejects(
        deliverNotification(
          f.id,
          databaseUrl!,
          { EMAIL_DELIVERY_URL: "https://example.test/mail" },
          async () => {
            throw new Error("Connection lost");
          },
        ),
        /Connection lost/,
      );
      assert.equal((await f.status()).status, "QUEUED");
    } finally {
      await f.pg.end();
    }
  },
);

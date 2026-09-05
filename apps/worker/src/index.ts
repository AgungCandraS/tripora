import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { Client } from "pg";

function makeRedis() {
  return new IORedis({
    host: process.env.QUEUE_REDIS_HOST ?? "localhost",
    port: Number(process.env.QUEUE_REDIS_PORT ?? 6379),
    maxRetriesPerRequest: null,
  });
}

function dbClient() {
  return new Client({
    connectionString:
      process.env.DATABASE_URL ??
      "postgresql://tripora:tripora@localhost:5432/tripora?schema=public",
  });
}

interface EmailJob {
  type?: string;
  bookingId?: string;
  bookingCode?: string;
  userId?: string;
  to?: string;
  link?: string;
}

const emailWorker = new Worker(
  "notifications",
  async (job) => {
    const data = job.data as EmailJob;
    // Link verifikasi = token sensitif: hanya di-log di non-production.
    const showLink = process.env.NODE_ENV !== "production" && data.link ? ` link=${data.link}` : "";
    // eslint-disable-next-line no-console
    console.log(
      `[worker] email job ${job.id} type=${data.type ?? "unknown"} to=${data.to ?? "-"} booking=${data.bookingCode ?? "-"}${showLink}`
    );

    // MVP: tanpa provider email eksternal, catat pengiriman di DB agar tidak stuck QUEUED.
    // Colok Resend/SES di sini nanti: kirim lalu update SENT; gagal -> throw agar BullMQ retry.
    if (data.type === "email_verification" && data.userId) {
      const pg = dbClient();
      await pg.connect();
      try {
        await pg.query(
          `UPDATE notifications SET status = 'SENT', sent_at = NOW()
           WHERE user_id = $1::uuid AND template = 'email_verification' AND status = 'QUEUED'`,
          [data.userId]
        );
      } finally {
        await pg.end();
      }
      return;
    }
    if (data.type === "booking_confirmed" && data.bookingId) {
      const pg = dbClient();
      await pg.connect();
      try {
        await pg.query(
          `UPDATE notifications SET status = 'SENT', sent_at = NOW()
           WHERE booking_id = $1::uuid AND template = 'booking_confirmed' AND status = 'QUEUED'`,
          [data.bookingId]
        );
      } finally {
        await pg.end();
      }
    }
  },
  {
    connection: makeRedis(),
    concurrency: 5,
  }
);

emailWorker.on("failed", (job, err) => {
  // eslint-disable-next-line no-console
  console.error(`[worker] job ${job?.id} failed: ${err.message}`);
});

/**
 * Reconciliation sweeper (PRD §44, BUSINESS_RULES.md payment expiry).
 * Missed webhooks must not leak capacity: expire stale PENDING_PAYMENT bookings
 * (+ their PENDING payments) and stale ACTIVE reservations, with audit rows.
 */
async function reconcile() {
  const expiryMinutes = Number(process.env.PAYMENT_EXPIRY_MINUTES ?? 30);
  const pg = dbClient();
  await pg.connect();
  try {
    const expiredReservations = await pg.query(
      `UPDATE reservations SET status = 'EXPIRED'
       WHERE status = 'ACTIVE' AND expires_at < NOW()`
    );
    const expiredBookings = await pg.query<{ id: string }>(
      `UPDATE bookings SET status = 'EXPIRED', updated_at = NOW()
       WHERE status = 'PENDING_PAYMENT'
         AND created_at < NOW() - ($1 || ' minutes')::interval
       RETURNING id`,
      [String(expiryMinutes)]
    );
    for (const row of expiredBookings.rows) {
      await pg.query(`UPDATE payments SET status = 'EXPIRED' WHERE booking_id = $1::uuid AND status = 'PENDING'`, [row.id]);
      await pg.query(
        `INSERT INTO audit_logs (id, action, resource_type, resource_id, metadata)
         VALUES (gen_random_uuid(), 'UPDATE', 'Booking', $1, $2)`,
        [row.id, JSON.stringify({ transition: "PENDING_PAYMENT->EXPIRED", reason: "PAYMENT_EXPIRED_SWEEP" })]
      );
    }
    if (expiredReservations.rowCount || expiredBookings.rowCount) {
      // eslint-disable-next-line no-console
      console.log(
        `[worker] reconcile: reservations expired=${expiredReservations.rowCount ?? 0} bookings expired=${expiredBookings.rowCount ?? 0}`
      );
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[worker] reconcile failed: ${(err as Error).message}`);
  } finally {
    await pg.end();
  }
}

const reconcileQueue = new Queue("reconcile", { connection: makeRedis() });
const reconcileWorker = new Worker(
  "reconcile",
  async () => {
    await reconcile();
  },
  { connection: makeRedis(), concurrency: 1 }
);

reconcileWorker.on("failed", (job, err) => {
  // eslint-disable-next-line no-console
  console.error(`[worker] reconcile job ${job?.id} failed: ${err.message}`);
});

async function scheduleReconcile() {
  await reconcileQueue.add("sweep", {}, { repeat: { every: 60_000 }, removeOnComplete: true });
}

// eslint-disable-next-line no-console
console.log("[worker] notifications worker started");
void scheduleReconcile().then(() => {
  // eslint-disable-next-line no-console
  console.log("[worker] reconcile sweeper scheduled every 60s");
});

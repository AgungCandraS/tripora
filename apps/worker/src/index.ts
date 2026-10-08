import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { deliverNotification, reconcile } from "./lifecycle";

function makeRedis() {
  return new IORedis({
    host: process.env.QUEUE_REDIS_HOST ?? "localhost",
    port: Number(process.env.QUEUE_REDIS_PORT ?? 6379),
    maxRetriesPerRequest: null,
  });
}

function connectionString() {
  return (
    process.env.DATABASE_URL ??
    "postgresql://tripora:tripora@localhost:5432/tripora?schema=public"
  );
}

const notificationQueue = new Queue("notifications", {
  connection: makeRedis(),
});
const emailWorker = new Worker(
  "notifications",
  (job) =>
    deliverNotification(
      String(job.data.notificationId ?? ""),
      connectionString(),
    ),
  { connection: makeRedis(), concurrency: 5 },
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

const reconcileQueue = new Queue("reconcile", { connection: makeRedis() });
const reconcileWorker = new Worker(
  "reconcile",
  async () => {
    await reconcile(connectionString(), notificationQueue);
  },
  { connection: makeRedis(), concurrency: 1 },
);

reconcileWorker.on("failed", (job, err) => {
  // eslint-disable-next-line no-console
  console.error(`[worker] reconcile job ${job?.id} failed: ${err.message}`);
});

async function scheduleReconcile() {
  await reconcileQueue.add(
    "sweep",
    {},
    { repeat: { every: 60_000 }, removeOnComplete: true },
  );
}

// eslint-disable-next-line no-console
console.log("[worker] notifications worker started");
void scheduleReconcile().then(() => {
  // eslint-disable-next-line no-console
  console.log("[worker] reconcile sweeper scheduled every 60s");
});

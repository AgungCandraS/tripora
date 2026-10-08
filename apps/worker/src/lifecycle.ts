import type { Queue } from "bullmq";
import { Client } from "pg";

export async function deliverNotification(
  id: string,
  connectionString: string,
  env: NodeJS.ProcessEnv = process.env,
  request: typeof fetch = fetch,
) {
  if (!id) throw new Error("Notification id is required");
  const pg = new Client({ connectionString });
  await pg.connect();
  try {
    await pg.query("BEGIN");
    const result = await pg.query<{
      status: string;
      payload: {
        type: string;
        to: string;
        link?: string;
        bookingCode?: string;
      };
    }>(
      "SELECT status, payload FROM notifications WHERE id = $1::uuid FOR UPDATE",
      [id],
    );
    const row = result.rows[0];
    if (!row || row.status === "SENT") {
      await pg.query("COMMIT");
      return;
    }
    const url = env.EMAIL_DELIVERY_URL;
    if (!url || !row.payload?.to)
      throw new Error(
        "Email delivery is not configured; notification remains queued",
      );
    const data = row.payload;
    const subject =
      data.type === "email_verification"
        ? "Verifikasi email Tripora"
        : `Pesanan ${data.bookingCode} dikonfirmasi`;
    const text =
      data.type === "email_verification"
        ? `Verifikasi email kamu: ${data.link}`
        : `Pesanan ${data.bookingCode} sudah dikonfirmasi. Buka Tripora untuk melihat tiket.`;
    // Adapter must honor Idempotency-Key to prevent duplicates after a delivery/DB crash.
    const response = await request(url, {
      method: "POST",
      signal: AbortSignal.timeout(10000),
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": id,
        ...(env.EMAIL_DELIVERY_TOKEN
          ? { Authorization: `Bearer ${env.EMAIL_DELIVERY_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({ to: data.to, subject, text }),
    });
    if (!response.ok)
      throw new Error(`Email delivery failed (${response.status})`);
    await pg.query(
      "UPDATE notifications SET status = 'SENT', sent_at = NOW() WHERE id = $1::uuid",
      [id],
    );
    await pg.query("COMMIT");
  } catch (error) {
    await pg.query("ROLLBACK");
    throw error;
  } finally {
    await pg.end();
  }
}

export async function reconcile(
  connectionString: string,
  notificationQueue: Queue,
) {
  const pg = new Client({ connectionString });
  await pg.connect();
  try {
    await pg.query("BEGIN");
    const expiredReservations = await pg.query(
      `UPDATE reservations SET status = 'EXPIRED'
       WHERE status = 'ACTIVE' AND expires_at < NOW()`,
    );
    const expiredBookings = await pg.query<{ id: string }>(
      `UPDATE bookings SET status = 'EXPIRED', updated_at = NOW()
       WHERE status = 'PENDING_PAYMENT'
         AND EXISTS (SELECT 1 FROM payments p WHERE p.booking_id = bookings.id AND p.status = 'PENDING' AND p.expires_at <= NOW())
       RETURNING id`,
    );
    for (const row of expiredBookings.rows) {
      await pg.query(
        `UPDATE payments SET status = 'EXPIRED' WHERE booking_id = $1::uuid AND status = 'PENDING'`,
        [row.id],
      );
      await pg.query(
        `INSERT INTO audit_logs (id, action, resource_type, resource_id, metadata)
         VALUES (gen_random_uuid(), 'UPDATE', 'Booking', $1, $2)`,
        [
          row.id,
          JSON.stringify({
            transition: "PENDING_PAYMENT->EXPIRED",
            reason: "PAYMENT_EXPIRED_SWEEP",
          }),
        ],
      );
    }
    await pg.query(`UPDATE bookings b SET status = 'COMPLETED', updated_at = NOW()
      FROM schedules s, activities a, destinations d
      WHERE b.schedule_id = s.id AND b.activity_id = a.id AND a.destination_id = d.id AND b.status = 'CHECKED_IN'
      AND ((b.booking_date + s.end_time::time + CASE WHEN s.end_time::time <= s.start_time::time THEN interval '1 day' ELSE interval '0 day' END) AT TIME ZONE d.timezone) <= NOW()`);
    await pg.query("COMMIT");
    const pending = await pg.query<{ id: string }>(
      "SELECT id FROM notifications WHERE status = 'QUEUED' AND payload IS NOT NULL ORDER BY id LIMIT 100",
    );
    for (const row of pending.rows) {
      const job = await notificationQueue.getJob(row.id);
      if (job && (await job.getState()) === "failed") await job.retry();
      else if (!job)
        await notificationQueue.add(
          "email",
          { notificationId: row.id },
          {
            jobId: row.id,
            attempts: 3,
            backoff: { type: "exponential", delay: 2000 },
            removeOnComplete: true,
            removeOnFail: 1000,
          },
        );
    }
    if (expiredReservations.rowCount || expiredBookings.rowCount) {
      // eslint-disable-next-line no-console
      console.log(
        `[worker] reconcile: reservations expired=${expiredReservations.rowCount ?? 0} bookings expired=${expiredBookings.rowCount ?? 0}`,
      );
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    await pg.query("ROLLBACK");
    throw err;
  } finally {
    await pg.end();
  }
}

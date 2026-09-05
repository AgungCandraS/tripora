import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue } from "bullmq";
import { PrismaService } from "../../prisma/prisma.service";

/** Thin producer around BullMQ queue "notifications". Job consumed by apps/worker. */
@Injectable()
export class NotificationsProducer {
  private queue: Queue;
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService
  ) {
    this.queue = new Queue("notifications", {
      connection: {
        host: this.config.get<string>("QUEUE_REDIS_HOST", "localhost"),
        port: this.config.get<number>("QUEUE_REDIS_PORT", 6379),
      },
      defaultJobOptions: { attempts: 3, backoff: { type: "exponential", delay: 2000 }, removeOnComplete: true, removeOnFail: 1000 },
    });
  }

  async enqueueVerificationEmail(userId: string, email: string, token: string) {
    // Fire-and-forget like booking emails: worker mengirim via provider
    // (lihat apps/worker). Link verify: {WEB_PUBLIC_BASE_URL}/auth/verify?token=
    try {
      const base = this.config.get<string>("WEB_PUBLIC_BASE_URL", "http://localhost:3000");
      await this.prisma.notification.create({
        data: { user_id: userId, channel: "email", template: "email_verification", status: "QUEUED" },
      });
      await this.queue.add("email", { type: "email_verification", userId, to: email, link: `${base}/auth/verify?token=${token}` });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[notifications] verify enqueue failed for ${email}:`, (err as Error).message);
    }
  }

  async enqueueBookingConfirmed(bookingId: string) {    // Fire-and-forget: queue failure must NEVER break booking confirmation.
    // The notification row persists intent; a sweeper/worker retry picks it up.
    try {
      const booking = await this.prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
      await this.prisma.notification.create({
        data: { booking_id: bookingId, channel: "email", template: "booking_confirmed", status: "QUEUED" },
      });
      await this.queue.add("email", { type: "booking_confirmed", bookingId, bookingCode: booking.booking_code, to: booking.booker_email });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[notifications] enqueue failed for booking ${bookingId}:`, (err as Error).message);
    }
  }
}

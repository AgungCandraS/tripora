import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue } from "bullmq";
import IORedis from "ioredis";
import { PrismaService } from "../../prisma/prisma.service";

/** Thin producer around BullMQ queue "notifications". Job consumed by apps/worker. */
@Injectable()
export class NotificationsProducer {
  private queue: Queue;
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.queue = new Queue("notifications", {
      connection:
        this.config.get<string>("QUEUE_REDIS_URL") ||
        this.config.get<string>("REDIS_URL")
          ? new IORedis(
              (this.config.get<string>("QUEUE_REDIS_URL") ||
                this.config.get<string>("REDIS_URL"))!,
              { maxRetriesPerRequest: null },
            )
          : {
              host: this.config.get<string>("QUEUE_REDIS_HOST", "localhost"),
              port: this.config.get<number>("QUEUE_REDIS_PORT", 6379),
              password:
                this.config.get<string>("QUEUE_REDIS_PASSWORD") || undefined,
            },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: true,
        removeOnFail: 1000,
      },
    });
  }

  async enqueueVerificationEmail(userId: string, email: string, token: string) {
    const base = this.config.get<string>(
      "WEB_PUBLIC_BASE_URL",
      "http://localhost:3000",
    );
    const row = await this.prisma.notification.create({
      data: {
        user_id: userId,
        channel: "email",
        template: "email_verification",
        status: "QUEUED",
        payload: {
          type: "email_verification",
          to: email,
          link: `${base}/auth/verify?token=${encodeURIComponent(token)}`,
        },
      },
    });
    // Queue availability is independent of the durable outbox. The sweeper retries it.
    await this.queue
      .add("email", { notificationId: row.id }, { jobId: row.id })
      .catch(() => undefined);
  }

  async enqueueBookingConfirmed(bookingId: string) {
    const booking = await this.prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
    });
    const row = await this.prisma.notification.upsert({
      where: { dedupe_key: `booking-confirmed:${bookingId}` },
      update: {},
      create: {
        dedupe_key: `booking-confirmed:${bookingId}`,
        booking_id: bookingId,
        channel: "email",
        template: "booking_confirmed",
        status: "QUEUED",
        payload: {
          type: "booking_confirmed",
          to: booking.booker_email,
          bookingCode: booking.booking_code,
        },
      },
    });
    await this.queue
      .add("email", { notificationId: row.id }, { jobId: row.id })
      .catch(() => undefined);
  }
}

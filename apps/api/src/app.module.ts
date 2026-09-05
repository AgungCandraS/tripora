import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { Redis } from "ioredis";
import { REDIS_CLIENT } from "./redis/redis.constants";
import { RedisThrottlerStorage } from "./common/services/throttle-redis.storage";
import { AuthGuard } from "./common/services/auth.guard";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { RolesModule } from "./modules/roles/roles.module";
import { VendorsModule } from "./modules/vendors/vendors.module";
import { RegionsModule } from "./modules/regions/regions.module";
import { DestinationsModule } from "./modules/destinations/destinations.module";
import { CategoriesModule } from "./modules/categories/categories.module";
import { ActivitiesModule } from "./modules/activities/activities.module";
import { PackagesModule } from "./modules/packages/packages.module";
import { SchedulesModule } from "./modules/schedules/schedules.module";
import { AvailabilityModule } from "./modules/availability/availability.module";
import { ReservationsModule } from "./modules/reservations/reservations.module";
import { BookingsModule } from "./modules/bookings/bookings.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { TicketsModule } from "./modules/tickets/tickets.module";
import { CheckinsModule } from "./modules/checkins/checkins.module";
import { PromotionsModule } from "./modules/promotions/promotions.module";
import { ReviewsModule } from "./modules/reviews/reviews.module";
import { RefundsModule } from "./modules/refunds/refunds.module";
import { EarningsModule } from "./modules/earnings/earnings.module";
import { PayoutsModule } from "./modules/payouts/payouts.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { CmsModule } from "./modules/cms/cms.module";
import { SearchModule } from "./modules/search/search.module";
import { AuditModule } from "./modules/audit/audit.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { AdminModule } from "./modules/admin/admin.module";
import { SettingsModule } from "./modules/settings/settings.module";
import { UploadsModule } from "./modules/uploads/uploads.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Anti-fake-booking rate limits (PRD §32). Defaults generous for dev; tighten via env.
    // Storage Redis agar limit lintas replika (OWASP A07).
    ThrottlerModule.forRootAsync({
      inject: [ConfigService, REDIS_CLIENT],
      useFactory: (config: ConfigService, redis: Redis) => ({
        throttlers: [
          { name: "default", ttl: 60_000, limit: config.get<number>("THROTTLE_DEFAULT_LIMIT", 120) },
        ],
        storage: new RedisThrottlerStorage(redis),
      }),
    }),
    PrismaModule,
    RedisModule,
    HealthModule,
    AuthModule,
    UsersModule,
    RolesModule,
    VendorsModule,
    RegionsModule,
    DestinationsModule,
    CategoriesModule,
    ActivitiesModule,
    PackagesModule,
    SchedulesModule,
    AvailabilityModule,
    ReservationsModule,
    BookingsModule,
    PaymentsModule,
    TicketsModule,
    CheckinsModule,
    PromotionsModule,
    ReviewsModule,
    RefundsModule,
    EarningsModule,
    PayoutsModule,
    NotificationsModule,
    CmsModule,
    SearchModule,
    AuditModule,
    AnalyticsModule,
    AdminModule,
    SettingsModule,
    UploadsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

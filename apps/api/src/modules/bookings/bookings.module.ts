import { Module } from "@nestjs/common";
import { AvailabilityModule } from "../availability/availability.module";
import { PromotionsModule } from "../promotions/promotions.module";
import { SettingsModule } from "../settings/settings.module";
import { TicketsModule } from "../tickets/tickets.module";
import { BookingLookupController, BookingsController } from "./bookings.controller";
import { BookingsService } from "./bookings.service";

@Module({
  imports: [AvailabilityModule, PromotionsModule, TicketsModule, SettingsModule],
  controllers: [BookingsController, BookingLookupController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}

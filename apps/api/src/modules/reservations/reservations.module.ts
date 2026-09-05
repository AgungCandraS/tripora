import { Module } from "@nestjs/common";
import { AvailabilityModule } from "../availability/availability.module";
import { SettingsModule } from "../settings/settings.module";
import { ReservationsController } from "./reservations.controller";
import { ReservationsService } from "./reservations.service";

@Module({
  imports: [AvailabilityModule, SettingsModule],
  controllers: [ReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}

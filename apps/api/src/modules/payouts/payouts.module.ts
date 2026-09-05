import { Module } from "@nestjs/common";
import { SettingsModule } from "../settings/settings.module";
import { AdminPayoutsController, VendorPayoutsController } from "./payouts.controller";

@Module({ imports: [SettingsModule], controllers: [VendorPayoutsController, AdminPayoutsController] })
export class PayoutsModule {}

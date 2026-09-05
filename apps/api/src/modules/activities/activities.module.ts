import { Module } from "@nestjs/common";
import { ActivitiesController, VendorActivitiesController } from "./activities.controller";
import { VendorActivitiesWriteController } from "./vendor-activities-write.controller";

@Module({ controllers: [ActivitiesController, VendorActivitiesController, VendorActivitiesWriteController] })
export class ActivitiesModule {}

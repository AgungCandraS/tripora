import { Module } from "@nestjs/common";
import { VendorCalendarController } from "./schedules.controller";
import { VendorSchedulesWriteController } from "./vendor-schedules-write.controller";

@Module({ controllers: [VendorCalendarController, VendorSchedulesWriteController] })
export class SchedulesModule {}

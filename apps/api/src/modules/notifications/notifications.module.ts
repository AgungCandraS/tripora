import { Module } from "@nestjs/common";
import { NotificationsController } from "./notifications.controller";
import { NotificationsProducer } from "./notifications-producer.service";

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsProducer],
  exports: [NotificationsProducer],
})
export class NotificationsModule {}

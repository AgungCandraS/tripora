import { Module } from "@nestjs/common";
import { TicketsModule } from "../tickets/tickets.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { SettingsModule } from "../settings/settings.module";
import { PaymentsController, WebhooksController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { MayarProvider } from "./mayar.provider";

@Module({
  imports: [TicketsModule, NotificationsModule, SettingsModule],
  controllers: [PaymentsController, WebhooksController],
  providers: [PaymentsService, MayarProvider],
  exports: [PaymentsService],
})
export class PaymentsModule {}

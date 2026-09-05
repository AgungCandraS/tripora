import { Module } from "@nestjs/common";
import { TicketsModule } from "../tickets/tickets.module";
import { CheckinsController } from "./checkins.controller";

@Module({
  imports: [TicketsModule],
  controllers: [CheckinsController],
})
export class CheckinsModule {}

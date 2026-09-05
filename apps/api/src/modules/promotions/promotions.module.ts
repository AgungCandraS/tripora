import { Module } from "@nestjs/common";
import { AdminPromotionsController } from "./admin-promotions.controller";
import { PromotionsService } from "./promotions.service";
import { VendorPromotionsController } from "./vendor-promotions.controller";

@Module({
  controllers: [VendorPromotionsController, AdminPromotionsController],
  providers: [PromotionsService],
  exports: [PromotionsService],
})
export class PromotionsModule {}

import { Module } from "@nestjs/common";
import { VendorProfileController, VendorsController } from "./vendors.controller";
import { VendorStaffController } from "./vendor-team.controller";
import { VendorsService } from "./vendors.service";

@Module({
  controllers: [VendorsController, VendorProfileController, VendorStaffController],
  providers: [VendorsService],
  exports: [VendorsService],
})
export class VendorsModule {}

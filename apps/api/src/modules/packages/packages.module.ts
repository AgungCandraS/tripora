import { Module } from "@nestjs/common";
import { PackagesController } from "./packages.controller";
import { VendorPackagesController } from "./vendor-packages.controller";

@Module({ controllers: [PackagesController, VendorPackagesController] })
export class PackagesModule {}

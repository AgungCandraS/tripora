import { Module } from "@nestjs/common";
import { DestinationsController } from "./destinations.controller";

@Module({ controllers: [DestinationsController] })
export class DestinationsModule {}

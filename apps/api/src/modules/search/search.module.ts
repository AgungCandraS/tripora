import { Module } from "@nestjs/common";
import { AvailabilityModule } from "../availability/availability.module";
import { SearchController } from "./search.controller";

@Module({ imports: [AvailabilityModule], controllers: [SearchController] })
export class SearchModule {}

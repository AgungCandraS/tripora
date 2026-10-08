import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../../common/decorators/auth.decorators";
import { AvailabilityService } from "./availability.service";
import { parseBookingDate } from "../../common/utils/slot-time";

@ApiTags("availability")
@Public()
@Controller("packages/:id/availability")
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Get()
  async forPackage(@Param("id") id: string, @Query("date") date?: string) {
    if (!date) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "date (YYYY-MM-DD) is required",
      });
    }
    const parsed = parseBookingDate(date);
    return this.availability.getAvailability(id, parsed);
  }
}

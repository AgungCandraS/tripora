import { BadRequestException, Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../../common/decorators/auth.decorators";
import { AvailabilityService } from "./availability.service";

@ApiTags("availability")
@Public()
@Controller("packages/:id/availability")
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Get()
  async forPackage(@Param("id") id: string, @Query("date") date?: string) {
    if (!date) {
      throw new BadRequestException({ code: "VALIDATION_ERROR", message: "date (YYYY-MM-DD) is required" });
    }
    const parsed = new Date(`${date}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException({ code: "VALIDATION_ERROR", message: "Invalid date" });
    }
    return this.availability.getAvailability(id, parsed);
  }
}

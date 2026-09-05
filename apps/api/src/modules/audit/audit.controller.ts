import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/auth.decorators";
import { AuditService } from "./audit.service";

@ApiTags("audit")
@ApiBearerAuth()
@Roles("ADMIN")
@Controller("admin/audit")
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  async list(@Query("limit") limit?: string) {
    const logs = await this.audit.list(limit ? Math.min(Number(limit) || 100, 500) : 100);
    return { logs };
  }
}

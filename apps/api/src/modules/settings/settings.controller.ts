import { Body, Controller, Get, Patch } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsString } from "class-validator";
import { Roles } from "../../common/decorators/auth.decorators";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { SettingsService } from "./settings.service";

class UpdateSettingDto {
  @IsString()
  key!: string;

  @IsString()
  value!: string;
}

@ApiTags("admin-settings")
@ApiBearerAuth()
@Controller("admin/settings")
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @Roles("ADMIN")
  async list() {
    return this.settings.list();
  }

  @Patch()
  @Roles("ADMIN")
  async update(@Body() dto: UpdateSettingDto, @CurrentUser() user: AuthUser) {
    return this.settings.set(dto.key, dto.value, user.id);
  }
}

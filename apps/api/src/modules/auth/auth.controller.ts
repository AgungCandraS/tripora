import { Body, Controller, Get, HttpCode, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/auth.decorators";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { AuthService } from "./auth.service";
import { ChangePasswordDto, LoginDto, RefreshDto, RegisterDto } from "./dto/auth.dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post("register")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post("login")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Public()
  @Post("refresh")
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Public()
  @Post("logout")
  @HttpCode(200)
  logout(@Body() dto: RefreshDto) {
    return this.auth.logout(dto.refreshToken);
  }

  @ApiBearerAuth()
  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user);
  }

  @Public()
  @Post("verify-email")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  verifyEmail(@Body() dto: { token: string }) {
    return this.auth.verifyEmail(dto.token);
  }

  @Public()
  @Post("resend-verification")
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  resend(@Body() dto: { email: string }) {
    return this.auth.resendVerification(dto.email);
  }

  @ApiBearerAuth()
  @Post("change-password")
  @HttpCode(200)
  changePassword(@Body() dto: ChangePasswordDto, @CurrentUser() user: AuthUser) {
    return this.auth.changePassword(user.id, dto.currentPassword, dto.newPassword);
  }
}

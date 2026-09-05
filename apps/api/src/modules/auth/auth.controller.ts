import { Body, Controller, Get, HttpCode, Post, Req, Res } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { ConfigService } from "@nestjs/config";
import { Request, Response } from "express";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/auth.decorators";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { AuthService } from "./auth.service";
import { ChangePasswordDto, LoginDto, RefreshDto, RegisterDto } from "./dto/auth.dto";

const ACCESS_MAX_AGE_MS = 15 * 60 * 1000;
const REFRESH_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly config: ConfigService) {}

  /**
   * Session via httpOnly cookie (OWASP A07): token tak bisa dibaca JS (anti-XSS exfil),
   * SameSite=Lax sehingga fetch/XHR cross-site tidak membawa cookie (anti-CSRF).
   */
  private cookieOpts(maxAge: number) {
    const production = this.config.get<string>("NODE_ENV", "development") === "production";
    return { httpOnly: true, secure: production, sameSite: "lax" as const, path: "/", maxAge };
  }

  private setSession(res: Response, tokens: { accessToken: string; refreshToken: string }) {
    res.cookie("accessToken", tokens.accessToken, this.cookieOpts(ACCESS_MAX_AGE_MS));
    res.cookie("refreshToken", tokens.refreshToken, this.cookieOpts(REFRESH_MAX_AGE_MS));
  }

  private clearSession(res: Response) {
    res.clearCookie("accessToken", { path: "/" });
    res.clearCookie("refreshToken", { path: "/" });
  }

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
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { user, tokens } = await this.auth.login(dto);
    this.setSession(res, tokens);
    return { user };
  }

  @Public()
  @Post("refresh")
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Body() dto: RefreshDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const raw = (req.cookies?.refreshToken as string | undefined) ?? dto.refreshToken;
    if (!raw) return { ok: false };
    const { tokens } = await this.auth.refresh(raw);
    this.setSession(res, tokens);
    return { ok: true };
  }

  @Public()
  @Post("logout")
  @HttpCode(200)
  async logout(
    @Req() req: Request,
    @Body() dto: RefreshDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const raw = (req.cookies?.refreshToken as string | undefined) ?? dto.refreshToken;
    await this.auth.logout(raw ?? "");
    this.clearSession(res);
    return { ok: true };
  }

  @ApiBearerAuth()
  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user);
  }

  @ApiBearerAuth()
  @Post("change-password")
  @HttpCode(200)
  changePassword(@Body() dto: ChangePasswordDto, @CurrentUser() user: AuthUser) {
    return this.auth.changePassword(user.id, dto.currentPassword, dto.newPassword);
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
}

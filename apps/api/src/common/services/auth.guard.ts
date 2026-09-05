import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { RoleCodeType } from "@tripora/types";
import { IS_PUBLIC_KEY, ROLES_KEY } from "../decorators/auth.decorators";
import { AuthRequest } from "../interfaces/auth-user.interface";
import { PrismaService } from "../../prisma/prisma.service";
import { TokenService } from "../services/token.service";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokenService,
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;

    const request = ctx.switchToHttp().getRequest<AuthRequest>();
    const header = request.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      throw new UnauthorizedException({ code: "UNAUTHORIZED", message: "Missing bearer token" });
    }
    const token = header.slice(7).trim();
    const payload = this.tokenService.verifyAccess(token);

    // JWT claims tidak cukup: status akun dicek ke DB agar suspend admin
    // langsung berlaku (token lama max 15 menit, refresh diblokir di service).
    const account = await this.prisma.user.findUnique({ where: { id: payload.sub }, select: { status: true } });
    if (!account || account.status !== "ACTIVE") {
      throw new ForbiddenException({ code: "USER_SUSPENDED", message: "Account is suspended" });
    }

    const roles = this.reflector.getAllAndOverride<RoleCodeType[]>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (roles && roles.length > 0) {
      const allowed = payload.roles.some((r) => roles.includes(r as RoleCodeType));
      if (!allowed) {
        throw new ForbiddenException({ code: "FORBIDDEN", message: "Insufficient role" });
      }
    }

    request.user = {
      id: payload.sub,
      email: payload.email,
      roles: payload.roles,
      vendorId: payload.vendorId,
      permissions: payload.permissions,
    };
    return true;
  }
}

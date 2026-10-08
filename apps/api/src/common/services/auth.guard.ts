import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { RoleCodeType } from "@tripora/types";
import {
  IS_PUBLIC_KEY,
  OPTIONAL_AUTH_KEY,
  ROLES_KEY,
} from "../decorators/auth.decorators";
import {
  PERMISSIONS_KEY,
  hasPermissions,
} from "../decorators/permission.decorators";
import { AuthRequest } from "../interfaces/auth-user.interface";
import { PrismaService } from "../../prisma/prisma.service";
import { TokenService } from "../services/token.service";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokenService,
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    const optional = this.reflector.getAllAndOverride<boolean>(
      OPTIONAL_AUTH_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (isPublic && !optional) return true;

    const request = ctx.switchToHttp().getRequest<AuthRequest>();
    // Token dari httpOnly cookie (web) atau header Bearer (kompat: Swagger, API client).
    // Cookie SameSite=Lax: request cross-site (fetch/XHR) tidak membawa cookie → aman CSRF.
    const header = request.headers.authorization;
    const token =
      header && header.startsWith("Bearer ")
        ? header.slice(7).trim()
        : (request.cookies?.accessToken as string | undefined);
    if (!token) {
      if (optional) return true;
      throw new UnauthorizedException({
        code: "UNAUTHORIZED",
        message: "Missing credentials",
      });
    }
    const payload = this.tokenService.verifyAccess(token);

    // JWT claims tidak cukup: status akun dicek ke DB agar suspend admin
    // langsung berlaku (token lama max 15 menit, refresh diblokir di service).
    const account = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { status: true },
    });
    if (!account || account.status !== "ACTIVE") {
      throw new ForbiddenException({
        code: "USER_SUSPENDED",
        message: "Account is suspended",
      });
    }

    const roles = this.reflector.getAllAndOverride<RoleCodeType[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (roles && roles.length > 0) {
      const allowed = payload.roles.some((r) =>
        roles.includes(r as RoleCodeType),
      );
      if (!allowed) {
        throw new ForbiddenException({
          code: "FORBIDDEN",
          message: "Insufficient role",
        });
      }
    }

    // Granular staff permissions (PRD §9). Owner & admin lolos penuh.
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (required && required.length > 0) {
      const isOwner = payload.roles.includes("VENDOR_OWNER");
      const isAdmin = payload.roles.includes("ADMIN");
      if (!isOwner && !isAdmin) {
        if (!payload.vendorId) {
          throw new ForbiddenException({
            code: "FORBIDDEN",
            message: "Missing permission",
          });
        }
        const member = await this.prisma.vendorMember.findUnique({
          where: {
            vendor_id_user_id: {
              vendor_id: payload.vendorId,
              user_id: payload.sub,
            },
          },
        });
        if (
          !member ||
          member.status !== "ACTIVE" ||
          !hasPermissions(member.permissions, required)
        ) {
          throw new ForbiddenException({
            code: "FORBIDDEN",
            message: "Missing permission",
          });
        }
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

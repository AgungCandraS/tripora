import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

export interface AccessTokenPayload {
  sub: string;
  email: string | null;
  roles: string[];
  vendorId?: string;
  permissions?: string[];
  type: "access";
}

@Injectable()
export class TokenService {
  constructor(private readonly jwt: JwtService, private readonly config: ConfigService) {}

  signAccess(payload: Omit<AccessTokenPayload, "type">): string {
    return this.jwt.sign({ ...payload, type: "access" }, {
      secret: this.config.get<string>("JWT_ACCESS_SECRET"),
      expiresIn: this.config.get<string>("JWT_ACCESS_EXPIRES_IN", "15m"),
    });
  }

  signRefresh(userId: string): string {
    const secret = this.config.get<string>("JWT_REFRESH_SECRET");
    return this.jwt.sign({ sub: userId, type: "refresh" }, { secret, expiresIn: this.config.get<string>("JWT_REFRESH_EXPIRES_IN", "30d") });
  }

  verifyAccess(token: string): AccessTokenPayload {
    try {
      const payload = this.jwt.verify<AccessTokenPayload>(token, {
        secret: this.config.get<string>("JWT_ACCESS_SECRET"),
      });
      if (payload.type !== "access") throw new Error("wrong token type");
      return payload;
    } catch {
      throw new UnauthorizedException({ code: "UNAUTHORIZED", message: "Invalid or expired token" });
    }
  }

  verifyRefresh(token: string): { sub: string; type: string } {
    try {
      const payload = this.jwt.verify<{ sub: string; type: string }>(token, {
        secret: this.config.get<string>("JWT_REFRESH_SECRET"),
      });
      if (payload.type !== "refresh") throw new Error("wrong token type");
      return payload;
    } catch {
      throw new UnauthorizedException({ code: "UNAUTHORIZED", message: "Invalid or expired refresh token" });
    }
  }
}

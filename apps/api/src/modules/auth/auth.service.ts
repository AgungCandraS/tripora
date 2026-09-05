import { BadRequestException, ConflictException, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { NotificationsProducer } from "../notifications/notifications-producer.service";
import { TokenService } from "../../common/services/token.service";
import { LoginDto, RegisterDto } from "./dto/auth.dto";
import { AuthUser } from "../../common/interfaces/auth-user.interface";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsProducer
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException({ code: "VALIDATION_ERROR", message: "Email already registered" });

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email,
        phone: dto.phone,
        full_name: dto.full_name,
        password_hash: passwordHash,
        roles: { create: { role: { connect: { code: "CUSTOMER" } } } },
      },
      include: { roles: { include: { role: true } } },
    });

    await this.issueVerification(user.id, email);
    await this.audit.log({ actorUserId: user.id, action: "CREATE", resourceType: "User", resourceId: user.id });
    // Tanpa token: akun wajib verifikasi email dulu (PRD §7.1).
    return { user: this.toUserDto(user) };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
      include: { roles: { include: { role: true } } },
    });
    if (!user || !user.password_hash) throw new UnauthorizedException({ code: "UNAUTHORIZED", message: "Invalid credentials" });

    const ok = await bcrypt.compare(dto.password, user.password_hash);
    if (!ok) throw new UnauthorizedException({ code: "UNAUTHORIZED", message: "Invalid credentials" });
    if (!user.email_verified) {
      throw new UnauthorizedException({ code: "EMAIL_NOT_VERIFIED", message: "Verifikasi email dulu sebelum masuk." });
    }

    // Refresh token rotation: hash new refresh token, store hash.
    const tokens = await this.issueTokens(user.id, user.email ?? null);
    await this.audit.log({ actorUserId: user.id, action: "LOGIN", resourceType: "User", resourceId: user.id });
    return { user: this.toUserDto(user), tokens };
  }

  async refresh(refreshToken: string) {
    const payload = this.tokenService.verifyRefresh(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { token_hash: this.hash(refreshToken) } });
    if (!stored || stored.user_id !== payload.sub) {
      throw new UnauthorizedException({ code: "UNAUTHORIZED", message: "Refresh token invalid" });
    }
    // rotate
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: payload.sub } });
    if (user.status !== "ACTIVE") {
      throw new ForbiddenException({ code: "USER_SUSPENDED", message: "Account is suspended" });
    }
    const tokens = await this.issueTokens(user.id, user.email ?? null);
    return { tokens };
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({ where: { token_hash: this.hash(refreshToken) } });
    return { ok: true };
  }

  async me(user: AuthUser) {
    const db = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { roles: { include: { role: true } }, memberships: true },
    });
    return this.toUserDto(db);
  }

  /** Buat token verifikasi baru (token lama yang belum dipakai dihapus) + antrekan email. */
  private async issueVerification(userId: string, email: string): Promise<void> {
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await this.prisma.emailVerificationToken.deleteMany({ where: { user_id: userId, consumed_at: null } });
    await this.prisma.emailVerificationToken.create({
      data: { user_id: userId, token_hash: tokenHash, expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    });
    await this.notifications.enqueueVerificationEmail(userId, email, token);
  }

  async verifyEmail(token: string) {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const row = await this.prisma.emailVerificationToken.findUnique({ where: { token_hash: tokenHash } });
    if (!row || row.consumed_at || row.expires_at < new Date()) {
      throw new BadRequestException({ code: "INVALID_TOKEN", message: "Link verifikasi tidak valid atau kedaluwarsa." });
    }
    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({ where: { id: row.id }, data: { consumed_at: new Date() } }),
      this.prisma.user.update({ where: { id: row.user_id }, data: { email_verified: true } }),
    ]);
    await this.audit.log({ actorUserId: row.user_id, action: "UPDATE", resourceType: "User", resourceId: row.user_id, metadata: { field: "email_verified" } });
    return { ok: true };
  }

  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    // Selalu OK agar tidak membocorkan email terdaftar — kecuali memang belum verifikasi.
    if (!user || user.email_verified || !user.email) return { ok: true };
    // Cooldown 60 detik anti-spam.
    const last = await this.prisma.emailVerificationToken.findFirst({
      where: { user_id: user.id, consumed_at: null },
      orderBy: { created_at: "desc" },
    });
    if (last && Date.now() - last.created_at.getTime() < 60_000) {
      throw new BadRequestException({ code: "RATE_LIMITED", message: "Tunggu sebentar sebelum kirim ulang." });
    }
    await this.issueVerification(user.id, user.email);
    return { ok: true };
  }

  /** Security settings: change password (PRD §7.2). Verifies current password first. */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.password_hash) {
      throw new UnauthorizedException({ code: "UNAUTHORIZED", message: "Password login not enabled for this account" });
    }
    const ok = await bcrypt.compare(currentPassword, user.password_hash);
    if (!ok) throw new UnauthorizedException({ code: "UNAUTHORIZED", message: "Current password is wrong" });
    await this.prisma.user.update({ where: { id: userId }, data: { password_hash: await bcrypt.hash(newPassword, 12) } });
    // Invalidate all sessions: password change logs out everywhere.
    await this.prisma.refreshToken.deleteMany({ where: { user_id: userId } });
    await this.audit.log({ actorUserId: userId, action: "UPDATE", resourceType: "User", resourceId: userId, metadata: { field: "password" } });
    return { ok: true };
  }

  private async issueTokens(userId: string, email: string | null) {
    const roles = await this.prisma.userRole.findMany({
      where: { user_id: userId },
      include: { role: true },
    });
    const roleCodes = roles.map((r) => r.role.code);

    const accessToken = this.tokenService.signAccess({
      sub: userId,
      email,
      roles: roleCodes,
      vendorId: await this.primaryVendorId(userId),
    });

    const rawRefresh = this.tokenService.signRefresh(userId);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({
      data: { user_id: userId, token_hash: this.hash(rawRefresh), expires_at: expiresAt },
    });

    return { accessToken, refreshToken: rawRefresh };
  }

  private async primaryVendorId(userId: string): Promise<string | undefined> {
    const member = await this.prisma.vendorMember.findFirst({
      where: { user_id: userId },
      orderBy: { id: "asc" },
    });
    return member?.vendor_id ?? undefined;
  }

  private hash(value: string) {
    return bcrypt.hashSync(value, 10);
  }

  private toUserDto(user: any) {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      full_name: user.full_name,
      roles: (user.roles ?? []).map((u: any) => ({
        role: { code: typeof u === "string" ? u : (u?.role?.code ?? u?.code) },
      })),
    };
  }
}

import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

/**
 * Platform settings: DB-backed key-value with env fallback.
 * Admin edits via PATCH /admin/settings; services read via get()/getNumber().
 */
export const KNOWN_SETTINGS = [
  {
    key: "PLATFORM_FEE",
    description: "Biaya layanan per booking (IDR)",
    env: "PLATFORM_FEE",
  },
  {
    key: "RESERVATION_HOLD_MINUTES",
    description: "TTL reservation hold (menit)",
    env: "RESERVATION_HOLD_MINUTES",
  },
  {
    key: "PAYMENT_EXPIRY_MINUTES",
    description: "Expiry invoice pembayaran (menit)",
    env: "PAYMENT_EXPIRY_MINUTES",
  },
  {
    key: "MAX_ACTIVE_UNPAID_PER_CONTACT",
    description: "Maks booking unpaid per kontak",
    env: "MAX_ACTIVE_UNPAID_PER_CONTACT",
  },
  {
    key: "PAYOUT_MINIMUM",
    description: "Minimum payout vendor (IDR)",
    env: "PAYOUT_MINIMUM",
  },
  {
    key: "SUPPORT_EMAIL",
    description: "Email bantuan customer",
    env: "SUPPORT_EMAIL",
  },
] as const;

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async list() {
    const rows = await this.prisma.platformSetting.findMany();
    const byKey = new Map(rows.map((r) => [r.key, r.value]));
    return KNOWN_SETTINGS.map((s) => ({
      key: s.key,
      description: s.description,
      value: byKey.get(s.key) ?? String(this.config.get(s.env, "")),
      source: byKey.has(s.key) ? ("database" as const) : ("env" as const),
    }));
  }

  async get(key: string): Promise<string | null> {
    const row = await this.prisma.platformSetting.findUnique({
      where: { key },
    });
    if (row) return row.value;
    const envKey = KNOWN_SETTINGS.find((s) => s.key === key)?.env;
    if (!envKey) return null;
    const v = this.config.get<string>(envKey);
    return v ?? null;
  }

  async getNumber(key: string, fallback: number): Promise<number> {
    const raw = await this.get(key);
    const n = raw === null || raw === "" ? NaN : Number(raw);
    return Number.isFinite(n) ? n : fallback;
  }

  async set(key: string, value: string, actorUserId?: string) {
    if (!KNOWN_SETTINGS.some((s) => s.key === key)) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: `Unknown setting: ${key}`,
      });
    }
    if (key !== "SUPPORT_EMAIL") {
      const number = Number(value);
      const bounds: Record<string, [number, number]> = {
        PLATFORM_FEE: [0, 10000000],
        RESERVATION_HOLD_MINUTES: [1, 60],
        PAYMENT_EXPIRY_MINUTES: [1, 120],
        MAX_ACTIVE_UNPAID_PER_CONTACT: [1, 20],
        PAYOUT_MINIMUM: [1, 100000000],
      };
      const range = bounds[key];
      if (
        !Number.isInteger(number) ||
        !range ||
        number < range[0] ||
        number > range[1]
      )
        throw new BadRequestException({
          code: "VALIDATION_ERROR",
          message: "Setting is outside allowed limits",
        });
    }
    const row = await this.prisma.platformSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    await this.audit.log({
      actorUserId,
      action: "UPDATE",
      resourceType: "PlatformSetting",
      resourceId: key,
      metadata: { value },
    });
    return row;
  }
}

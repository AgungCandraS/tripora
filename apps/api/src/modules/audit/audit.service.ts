import { Injectable } from "@nestjs/common";
import { AuditAction } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    actorUserId?: string | null;
    action: AuditAction;
    resourceType: string;
    resourceId: string;
    metadata?: Record<string, unknown>;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          actor_user_id: params.actorUserId ?? null,
          action: params.action,
          resource_type: params.resourceType,
          resource_id: params.resourceId,
          metadata: params.metadata ? (params.metadata as object) : undefined,
        },
      });
    } catch {
      // Audit log must never break the request; failures are swallowed.
    }
  }

  async list(limit = 100) {
    return this.prisma.auditLog.findMany({
      orderBy: { created_at: "desc" },
      take: limit,
    });
  }
}

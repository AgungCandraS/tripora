import { BadRequestException, Body, Controller, Get, Param, Patch, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString } from "class-validator";
import { Roles } from "../../common/decorators/auth.decorators";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

class UpdateUserDto {
  @IsOptional()
  @IsIn(["ACTIVE", "SUSPENDED"])
  status?: "ACTIVE" | "SUSPENDED";

  @IsOptional()
  @IsString({ each: true })
  roles?: string[];
}

@ApiTags("admin-users")
@ApiBearerAuth()
@Roles("ADMIN")
@Controller("admin/users")
export class AdminUsersController {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  @Get()
  async list(@Query("role") role?: string, @Query("limit") limit?: string) {
    const users = await this.prisma.user.findMany({
      where: role ? { roles: { some: { role: { code: role as never } } } } : undefined,
      orderBy: { created_at: "desc" },
      take: Math.min(Number(limit) || 100, 500),
      include: { roles: { include: { role: true } } },
    });
    return { users };
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateUserDto, @CurrentUser() user: AuthUser) {
    if (id === user.id) {
      throw new BadRequestException({ code: "VALIDATION_ERROR", message: "Cannot modify your own account" });
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.roles
          ? { roles: { deleteMany: {}, create: dto.roles.map((code) => ({ role: { connect: { code: code as never } } })) } }
          : {}),
      },
      include: { roles: { include: { role: true } } },
    });
    await this.audit.log({ actorUserId: user.id, action: "UPDATE", resourceType: "User", resourceId: id, metadata: dto as Record<string, unknown> });
    return updated;
  }
}

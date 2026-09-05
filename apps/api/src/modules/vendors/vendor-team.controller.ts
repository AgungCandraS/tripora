import { BadRequestException, Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString } from "class-validator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/auth.decorators";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

class InviteStaffDto {
  @IsEmail()
  email!: string;

  @IsString()
  role_name!: string;
}

const STAFF_ROLES = ["VENDOR_STAFF"];

@ApiTags("vendor-staff")
@ApiBearerAuth()
@Roles("VENDOR_OWNER")
@Controller("vendor/staff")
export class VendorStaffController {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    if (!user.vendorId) return { staff: [] };
    const staff = await this.prisma.vendorMember.findMany({
      where: { vendor_id: user.vendorId },
      include: { user: { select: { id: true, full_name: true, email: true } } },
    });
    return { staff };
  }

  @Post()
  async invite(@CurrentUser() user: AuthUser, @Body() dto: InviteStaffDto) {
    if (!user.vendorId) throw new BadRequestException({ code: "FORBIDDEN", message: "No vendor attached" });
    // Privilege-escalation guard (OWASP A01): invite hanya boleh jadi staff biasa,
    // bukan VENDOR_OWNER/ADMIN. Owner tetap satu (pendiri vendor).
    if (!STAFF_ROLES.includes(dto.role_name)) {
      throw new BadRequestException({ code: "VALIDATION_ERROR", message: "Invalid staff role" });
    }
    const account = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!account) throw new BadRequestException({ code: "NOT_FOUND", message: "No account with this email; ask them to register first" });
    const member = await this.prisma.vendorMember.upsert({
      where: { vendor_id_user_id: { vendor_id: user.vendorId, user_id: account.id } },
      update: { role_name: dto.role_name, status: "ACTIVE" },
      create: { vendor_id: user.vendorId, user_id: account.id, role_name: dto.role_name, status: "ACTIVE" },
    });
    // Grant workspace role so staff can open /staff after re-login (JWT embeds roles).
    const staffRole = await this.prisma.role.findUnique({ where: { code: "VENDOR_STAFF" } });
    if (staffRole) {
      await this.prisma.userRole.upsert({
        where: { user_id_role_id: { user_id: account.id, role_id: staffRole.id } },
        update: {},
        create: { user_id: account.id, role_id: staffRole.id },
      });
    }
    await this.audit.log({ actorUserId: user.id, action: "CREATE", resourceType: "VendorMember", resourceId: member.id });
    return member;
  }

  @Patch(":id")
  async update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: { role_name?: string; status?: "ACTIVE" | "SUSPENDED" }) {
    const member = await this.prisma.vendorMember.findUnique({ where: { id } });
    if (!member || member.vendor_id !== user.vendorId) {
      throw new BadRequestException({ code: "NOT_FOUND", message: "Staff not found" });
    }
    return this.prisma.vendorMember.update({
      where: { id },
      data: { role_name: dto.role_name, status: dto.status },
    });
  }
}

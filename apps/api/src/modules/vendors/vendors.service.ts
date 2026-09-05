import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateStaffDto, CreateVendorDto, VendorDocumentDto } from "./dto/vendor.dto";

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async create(userId: string, dto: CreateVendorDto) {
    const existing = await this.prisma.vendor.findUnique({ where: { slug: this.slugify(dto.name) } });
    if (existing) throw new ConflictException({ code: "VALIDATION_ERROR", message: "Vendor with this name exists" });

    const vendor = await this.prisma.vendor.create({
      data: {
        owner_user_id: userId,
        name: dto.name,
        slug: this.slugify(dto.name),
        description: dto.description,
        phone: dto.phone,
        email: dto.email,
        status: "PENDING",
      },
    });
    await this.prisma.vendorMember.create({ data: { vendor_id: vendor.id, user_id: userId, role_name: "VENDOR_OWNER" } });
    // Grant workspace role so the owner can open /vendor after re-login (JWT embeds roles).
    const ownerRole = await this.prisma.role.findUnique({ where: { code: "VENDOR_OWNER" } });
    if (ownerRole) {
      await this.prisma.userRole.upsert({
        where: { user_id_role_id: { user_id: userId, role_id: ownerRole.id } },
        update: {},
        create: { user_id: userId, role_id: ownerRole.id },
      });
    }
    await this.audit.log({ actorUserId: userId, action: "CREATE", resourceType: "Vendor", resourceId: vendor.id });
    return vendor;
  }

  async getProfile(userId: string, vendorId?: string) {
    const where = vendorId ? { id: vendorId } : undefined;
    const vendor = await this.prisma.vendor.findFirstOrThrow({ where: where ?? { owner_user_id: userId }, include: { members: { include: { user: true } }, documents: true } });
    if (vendor.owner_user_id !== userId && !vendor.members.some((m) => m.user_id === userId)) {
      throw new ForbiddenException({ code: "FORBIDDEN", message: "No access to this vendor" });
    }
    return vendor;
  }

  async addDocument(userId: string, vendorId: string, dto: VendorDocumentDto) {
    await this.guardVendor(userId, vendorId);
    return this.prisma.vendorDocument.create({ data: { vendor_id: vendorId, type: dto.type, object_key: dto.object_key, verification_status: "PENDING" } });
  }

  async addStaff(userId: string, vendorId: string, dto: CreateStaffDto) {
    await this.guardVendor(userId, vendorId, "VENDOR_OWNER");
    return this.prisma.vendorMember.create({ data: { vendor_id: vendorId, user_id: dto.userId, role_name: dto.role_name, status: "ACTIVE" } });
  }

  async generateBookingSlug() {
    return this.prisma.vendor.count();
  }

  private async guardVendor(userId: string, vendorId: string, requireRole?: string) {
    const member = await this.prisma.vendorMember.findUnique({ where: { vendor_id_user_id: { vendor_id: vendorId, user_id: userId } } });
    if (!member) throw new ForbiddenException({ code: "FORBIDDEN", message: "No access to this vendor" });
    if (requireRole && member.role_name !== requireRole) throw new ForbiddenException({ code: "FORBIDDEN", message: "Insufficient vendor role" });
  }

  private slugify(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }
}

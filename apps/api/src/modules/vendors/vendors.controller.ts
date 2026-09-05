import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/auth.decorators";
import { Permissions } from "../../common/decorators/permission.decorators";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { PrismaService } from "../../prisma/prisma.service";
import { VendorsService } from "./vendors.service";
import { CreateStaffDto, CreateVendorDto, VendorDocumentDto } from "./dto/vendor.dto";

@ApiTags("vendors")
@ApiBearerAuth()
@Controller("vendors")
export class VendorsController {
  constructor(private readonly vendors: VendorsService) {}

  @Post()
  async create(@Body() dto: CreateVendorDto, @CurrentUser() user: AuthUser) {
    return this.vendors.create(user.id, dto);
  }
}

@ApiTags("vendor-profile")
@ApiBearerAuth()
@Controller("vendor")
export class VendorProfileController {
  constructor(private readonly vendors: VendorsService, private readonly prisma: PrismaService) {}

  @Get("profile")
  @Roles("VENDOR_OWNER", "ADMIN")
  async profile(@CurrentUser() user: AuthUser) {
    return this.vendors.getProfile(user.id, user.vendorId);
  }

  @Patch("profile")
  @Roles("VENDOR_OWNER")
  async update(@CurrentUser() user: AuthUser, @Body() dto: Partial<CreateVendorDto>) {
    const vendor = await this.vendors.getProfile(user.id, user.vendorId);
    // Mass-assignment guard (OWASP A01): status/slug/owner/komisi tak bisa diubah via sini.
    const data: {
      name?: string;
      description?: string | null;
      phone?: string | null;
      email?: string | null;
      bank_name?: string | null;
      bank_account_number?: string | null;
      bank_account_name?: string | null;
    } = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.bank_name !== undefined) data.bank_name = dto.bank_name;
    if (dto.bank_account_number !== undefined) data.bank_account_number = dto.bank_account_number;
    if (dto.bank_account_name !== undefined) data.bank_account_name = dto.bank_account_name;
    return this.prisma.vendor.update({ where: { id: vendor.id }, data });
  }

  @Post("documents")
  @Roles("VENDOR_OWNER")
  async addDocument(@CurrentUser() user: AuthUser, @Body() dto: VendorDocumentDto) {
    if (!user.vendorId) throw new Error("No vendor attached");
    return this.vendors.addDocument(user.id, user.vendorId, dto);
  }

  @Get("bookings")
  @Roles("VENDOR_OWNER", "VENDOR_STAFF", "ADMIN")
  @Permissions("booking.read")
  async bookings(@CurrentUser() user: AuthUser) {
    if (!user.vendorId) return { bookings: [] };
    const bookings = await this.prisma.booking.findMany({
      where: { vendor_id: user.vendorId },
      orderBy: { created_at: "desc" },
      include: { participants: true, payment: true, ticket: true },
    });
    return { bookings };
  }

  @Get("revenue")
  @Roles("VENDOR_OWNER", "ADMIN")
  @Permissions("revenue.read")
  async revenue(@CurrentUser() user: AuthUser) {
    if (!user.vendorId) return { gross: 0, commission: 0, net: 0, bookings: 0 };
    const agg = await this.prisma.vendorEarning.aggregate({ where: { vendor_id: user.vendorId }, _sum: { gross_amount: true, commission_amount: true, net_amount: true }, _count: true });
    return {
      gross: agg._sum.gross_amount ?? 0,
      commission: agg._sum.commission_amount ?? 0,
      net: agg._sum.net_amount ?? 0,
      bookings: agg._count,
    };
  }

  @ApiBearerAuth()
  @Roles("VENDOR_OWNER")
  @Post("staff")
  async addStaff(@CurrentUser() user: AuthUser, @Body() dto: CreateStaffDto) {
    if (!user.vendorId) throw new Error("No vendor attached");
    return this.vendors.addStaff(user.id, user.vendorId, dto);
  }
}

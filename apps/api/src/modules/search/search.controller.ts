import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Prisma } from "@prisma/client";
import { Public } from "../../common/decorators/auth.decorators";
import { parseBookingDate } from "../../common/utils/slot-time";
import { PrismaService } from "../../prisma/prisma.service";
import { AvailabilityService } from "../availability/availability.service";

function numeric(
  value: string | undefined,
  name: string,
  min: number,
  max: number,
  integer = false,
) {
  if (value === undefined || value === "") return undefined;
  const result = Number(value);
  if (
    !Number.isFinite(result) ||
    result < min ||
    result > max ||
    (integer && !Number.isInteger(result))
  )
    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      message: `Invalid ${name}`,
    });
  return result;
}

@ApiTags("search")
@Public()
@Controller("search")
export class SearchController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
  ) {}

  @Get()
  async search(@Query() query: Record<string, string | undefined>) {
    const page = numeric(query.page, "page", 1, 100000, true) ?? 1;
    const min = numeric(query.min_price, "min_price", 0, 2147483647);
    const max = numeric(query.max_price, "max_price", 0, 2147483647);
    if (min !== undefined && max !== undefined && min > max)
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "Minimum price exceeds maximum",
      });
    const participants = numeric(query.guests, "guests", 1, 1000, true);
    const date = query.date ? parseBookingDate(query.date) : undefined;
    const latitude = numeric(query.lat, "lat", -90, 90);
    const longitude = numeric(query.lng, "lng", -180, 180);
    const radius = numeric(query.radius, "radius", 0.01, 500);
    const useGeo = [latitude, longitude, radius].some((v) => v !== undefined);
    if (useGeo && [latitude, longitude, radius].some((v) => v === undefined))
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "Latitude, longitude and radius must be supplied together",
      });
    let geoIds: string[] | undefined;
    if (useGeo) {
      const rows = await this.prisma.$queryRaw<
        { id: string }[]
      >`SELECT id FROM activities WHERE geom IS NOT NULL AND ST_DWithin(geom, ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography, ${radius! * 1000})`;
      geoIds = rows.map((row) => row.id);
    }
    const packages: Prisma.PackageWhereInput = {
      status: "ACTIVE",
      base_price: { gte: min, lte: max },
      ...(participants
        ? {
            min_participants: { lte: participants },
            max_participants: { gte: participants },
          }
        : {}),
    };
    const q = query.q?.trim().slice(0, 200);
    const where: Prisma.ActivityWhereInput = {
      status: "PUBLISHED",
      vendor: { status: "APPROVED" },
      id: geoIds ? { in: geoIds } : undefined,
      destination: query.destination ? { slug: query.destination } : undefined,
      categories: query.category
        ? { some: { category: { slug: query.category } } }
        : undefined,
      packages: { some: packages },
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { destination: { name: { contains: q, mode: "insensitive" } } },
              { vendor: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    };
    // Filter availability before pagination, so totals describe the entire result set.
    const candidates = await this.prisma.activity.findMany({
      where,
      include: {
        destination: true,
        images: true,
        categories: { include: { category: true } },
        packages: { where: packages },
      },
      orderBy: { created_at: "desc" },
    });
    const activities: typeof candidates = [];
    for (const activity of candidates) {
      if (date) {
        const available = [];
        for (const pkg of activity.packages) {
          const result = await this.availability.getAvailability(pkg.id, date);
          if (
            result.slots.some(
              (slot) =>
                slot.available >= (participants ?? pkg.min_participants),
            )
          )
            available.push(pkg);
        }
        if (!available.length) continue;
        activities.push({ ...activity, packages: available });
      } else activities.push(activity);
    }
    const price = (activity: (typeof activities)[number]) =>
      Math.min(...activity.packages.map((pkg) => pkg.base_price));
    if (query.sort === "price_asc")
      activities.sort((a, b) => price(a) - price(b));
    else if (query.sort === "price_desc")
      activities.sort((a, b) => price(b) - price(a));
    else if (query.sort === "rating")
      activities.sort(
        (a, b) => Number(b.rating_average) - Number(a.rating_average),
      );
    const pageSize = 12;
    return {
      activities: activities.slice((page - 1) * pageSize, page * pageSize),
      total: activities.length,
      page,
      pageSize,
    };
  }
}

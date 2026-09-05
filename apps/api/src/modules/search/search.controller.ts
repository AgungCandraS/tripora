import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Prisma } from "@prisma/client";
import { Public } from "../../common/decorators/auth.decorators";
import { PrismaService } from "../../prisma/prisma.service";

interface SearchRow {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  destination_id: string;
  rating_average: unknown;
  rating_count: number;
  rank: number;
  distance_m: number | null;
}

@ApiTags("search")
@Public()
@Controller("search")
export class SearchController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * V1 search: PostgreSQL Full Text Search (tsvector rank over title/description)
   * + PostGIS radius (ST_DWithin on geom) + prisma filters for the rest.
   * Raw SQL is used for FTS/PostGIS per DATABASE.md; Prisma for the rest.
   */
  @Get()
  async search(
    @Query("q") q?: string,
    @Query("destination") destination?: string,
    @Query("category") category?: string,
    @Query("min_price") minPrice?: string,
    @Query("max_price") maxPrice?: string,
    @Query("lat") lat?: string,
    @Query("lng") lng?: string,
    @Query("radius") radiusKm?: string,
    @Query("page") page?: string
  ) {
    const take = 12;
    const pageNum = Math.max(1, Number(page) || 1);
    const skip = (pageNum - 1) * take;
    const useGeo = lat !== undefined && lng !== undefined && radiusKm !== undefined;

    if (q || useGeo) {
      const query = q?.trim() ? q.trim() : "";
      const tsQuery = query ? query.split(/\s+/).join(" & ") : "";
      const latitude = Number(lat);
      const longitude = Number(lng);
      const radiusM = Math.min(Number(radiusKm) || 0, 500) * 1000;

      const rows = await this.prisma.$queryRaw<SearchRow[]>`
        SELECT a.id, a.title, a.slug, a.short_description, a.destination_id,
               a.rating_average, a.rating_count,
               ${tsQuery ? Prisma.sql`ts_rank(to_tsvector('simple', coalesce(a.title,'') || ' ' || coalesce(a.description,'')), plainto_tsquery('simple', ${query}))` : Prisma.sql`0`} AS rank,
               ${useGeo && Number.isFinite(latitude) && Number.isFinite(longitude) ? Prisma.sql`ST_Distance(a.geom, ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography)` : Prisma.sql`NULL`} AS distance_m
        FROM activities a
        ${destination ? Prisma.sql`JOIN destinations d ON d.id = a.destination_id` : Prisma.empty}
        ${category ? Prisma.sql`JOIN activity_categories ac ON ac.activity_id = a.id JOIN categories c ON c.id = ac.category_id` : Prisma.empty}
        WHERE a.status = 'PUBLISHED'
          ${tsQuery ? Prisma.sql`AND to_tsvector('simple', coalesce(a.title,'') || ' ' || coalesce(a.description,'')) @@ plainto_tsquery('simple', ${query})` : Prisma.empty}
          ${destination ? Prisma.sql`AND d.slug = ${destination}` : Prisma.empty}
          ${category ? Prisma.sql`AND c.slug = ${category}` : Prisma.empty}
          ${useGeo && Number.isFinite(latitude) && Number.isFinite(longitude) && radiusM > 0 ? Prisma.sql`AND a.geom IS NOT NULL AND ST_DWithin(a.geom, ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography, ${radiusM})` : Prisma.empty}
        ORDER BY rank DESC, a.rating_average DESC
        LIMIT ${take} OFFSET ${skip}
      `;

      const activities = await this.prisma.activity.findMany({
        where: { id: { in: rows.map((r) => r.id) } },
        include: { destination: true, images: true, categories: { include: { category: true } }, packages: true },
      });
      const byId = new Map(activities.map((a) => [a.id, a]));
      return {
        activities: rows.map((r) => ({ ...byId.get(r.id), _rank: Number(r.rank), _distanceM: r.distance_m === null ? null : Number(r.distance_m) })),
        total: rows.length,
        page: pageNum,
        pageSize: take,
      };
    }

    const where: Prisma.ActivityWhereInput = {
      status: "PUBLISHED",
      destination: destination ? { slug: destination } : undefined,
      categories: category ? { some: { category: { slug: category } } } : undefined,
      packages: {
        some: {
          ...(minPrice ? { base_price: { gte: Number(minPrice) } } : {}),
          ...(maxPrice ? { base_price: { lte: Number(maxPrice) } } : {}),
        },
      },
    };

    const [activities, total] = await this.prisma.$transaction([
      this.prisma.activity.findMany({
        where,
        include: { destination: true, images: true, categories: { include: { category: true } }, packages: true },
        orderBy: { created_at: "desc" },
        skip,
        take,
      }),
      this.prisma.activity.count({ where }),
    ]);

    return { activities, total, page: pageNum, pageSize: take };
  }
}

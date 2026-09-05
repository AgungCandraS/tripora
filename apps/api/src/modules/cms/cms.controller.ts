import { Body, Controller, Delete, Get, Param, Post, Put } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Public } from "../../common/decorators/auth.decorators";
import { Roles } from "../../common/decorators/auth.decorators";
import { PrismaService } from "../../prisma/prisma.service";

@ApiTags("cms")
@Controller("cms")
export class CmsController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get("pages/:slug")
  async page(@Param("slug") slug: string) {
    return this.prisma.cmsPage.findUnique({ where: { slug } });
  }

  @Public()
  @Get("banners")
  async banners() {
    return this.prisma.banner.findMany({ where: { active: true }, orderBy: { sort_order: "asc" } });
  }
}

@ApiTags("admin-cms")
@ApiBearerAuth()
@Roles("ADMIN")
@Controller("admin/cms")
export class AdminCmsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("pages")
  async pages() {
    return this.prisma.cmsPage.findMany({ orderBy: { id: "desc" } });
  }

  @Post("pages")
  async createPage(@Body() body: { slug: string; title: string; body: string; seo?: Record<string, unknown> }) {
    return this.prisma.cmsPage.create({ data: { slug: body.slug, title: body.title, body: body.body, seo_metadata: body.seo ? (body.seo as object) : undefined, status: "PUBLISHED" } });
  }

  @Put("pages/:id")
  async updatePage(@Param("id") id: string, @Body() body: Partial<{ title: string; body: string; status: "DRAFT" | "PUBLISHED" }>) {
    // Explicit fields (OWASP A01): slug tak bisa diubah via sini.
    const data: { title?: string; body?: string; status?: "DRAFT" | "PUBLISHED" } = {};
    if (typeof body?.title === "string") data.title = body.title;
    if (typeof body?.body === "string") data.body = body.body;
    if (body?.status === "DRAFT" || body?.status === "PUBLISHED") data.status = body.status;
    return this.prisma.cmsPage.update({ where: { id }, data });
  }

  @Delete("pages/:id")
  async deletePage(@Param("id") id: string) {
    return this.prisma.cmsPage.delete({ where: { id } });
  }

  @Post("banners")
  async createBanner(@Body() body: { title: string; imageKey: string; targetUrl?: string; active?: boolean; sortOrder?: number }) {
    return this.prisma.banner.create({ data: { title: body.title, image_key: body.imageKey, target_url: body.targetUrl, active: body.active ?? true, sort_order: body.sortOrder ?? 0 } });
  }
}

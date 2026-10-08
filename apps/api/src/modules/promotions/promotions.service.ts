import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

type Tx = Prisma.TransactionClient;

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Validate a promo code and return the discount amount (in IDR minor units). */
  async validateSync(
    code: string,
    subtotal: number,
    bookingId: string | null,
    tx: Tx,
    vendorId?: string,
  ): Promise<number> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"promotion:" + code}))`;
    const promo = await tx.promotion.findUnique({ where: { code } });
    if (!promo || promo.status !== "ACTIVE") {
      throw new BadRequestException({
        code: "INVALID_PROMOTION",
        message: "Promotion is invalid",
      });
    }
    const now = new Date();
    if (promo.start_at && promo.start_at > now)
      throw new BadRequestException({
        code: "INVALID_PROMOTION",
        message: "Not yet active",
      });
    if (promo.end_at && promo.end_at < now)
      throw new BadRequestException({
        code: "INVALID_PROMOTION",
        message: "Already expired",
      });
    if (promo.minimum_purchase && subtotal < promo.minimum_purchase) {
      throw new BadRequestException({
        code: "INVALID_PROMOTION",
        message: "Minimum purchase not met",
      });
    }
    if (promo.usage_limit != null) {
      const used = await tx.promotionUsage.count({
        where: { promotion_id: promo.id },
      });
      if (used >= promo.usage_limit)
        throw new BadRequestException({
          code: "INVALID_PROMOTION",
          message: "Quota exhausted",
        });
    }

    if (promo.vendor_id && promo.vendor_id !== vendorId)
      throw new BadRequestException({
        code: "INVALID_PROMOTION",
        message: "Promotion is for another vendor",
      });
    const amount = Math.max(
      0,
      Math.min(
        subtotal,
        promo.type === "PERCENT"
          ? Math.round((subtotal * promo.value) / 100)
          : promo.value,
      ),
    );

    if (bookingId)
      await tx.promotionUsage.create({
        data: { promotion_id: promo.id, booking_id: bookingId, amount },
      });
    return amount;
  }

  async validateForBooking(code: string, subtotal: number, bookingId: string) {
    return this.prisma.$transaction((tx) =>
      this.validateSync(code, subtotal, bookingId, tx),
    );
  }

  /** Side-effect-free discount computation for price preview (no usage row written). */
  async previewDiscount(
    code: string,
    subtotal: number,
    vendorId?: string,
  ): Promise<number> {
    const promo = await this.prisma.promotion.findUnique({ where: { code } });
    if (!promo || promo.status !== "ACTIVE") {
      throw new BadRequestException({
        code: "INVALID_PROMOTION",
        message: "Promotion is invalid",
      });
    }
    const now = new Date();
    if (promo.start_at && promo.start_at > now)
      throw new BadRequestException({
        code: "INVALID_PROMOTION",
        message: "Not yet active",
      });
    if (promo.end_at && promo.end_at < now)
      throw new BadRequestException({
        code: "INVALID_PROMOTION",
        message: "Already expired",
      });
    if (promo.minimum_purchase && subtotal < promo.minimum_purchase) {
      throw new BadRequestException({
        code: "INVALID_PROMOTION",
        message: "Minimum purchase not met",
      });
    }
    if (promo.usage_limit != null) {
      const used = await this.prisma.promotionUsage.count({
        where: { promotion_id: promo.id },
      });
      if (used >= promo.usage_limit)
        throw new BadRequestException({
          code: "INVALID_PROMOTION",
          message: "Quota exhausted",
        });
    }
    if (promo.vendor_id && promo.vendor_id !== vendorId)
      throw new BadRequestException({
        code: "INVALID_PROMOTION",
        message: "Promotion is for another vendor",
      });
    return Math.max(
      0,
      Math.min(
        subtotal,
        promo.type === "PERCENT"
          ? Math.round((subtotal * promo.value) / 100)
          : promo.value,
      ),
    );
  }
}

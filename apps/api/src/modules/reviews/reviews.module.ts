import { Module } from "@nestjs/common";
import { AdminReviewsController, ReviewsController, VendorReviewsController } from "./reviews.controller";

@Module({ controllers: [ReviewsController, VendorReviewsController, AdminReviewsController] })
export class ReviewsModule {}

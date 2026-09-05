import { Module } from "@nestjs/common";
import { AdminCategoriesController } from "./admin-categories.controller";
import { CategoriesController } from "./categories.controller";

@Module({ controllers: [CategoriesController, AdminCategoriesController] })
export class CategoriesModule {}

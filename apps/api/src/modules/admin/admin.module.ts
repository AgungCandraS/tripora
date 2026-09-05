import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminUsersController } from "./admin-users.controller";

@Module({ controllers: [AdminController, AdminUsersController] })
export class AdminModule {}

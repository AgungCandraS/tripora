import { Module } from "@nestjs/common";
import { MeController } from "./me.controller";
import { UsersController } from "./users.controller";

@Module({
  controllers: [UsersController, MeController],
})
export class UsersModule {}

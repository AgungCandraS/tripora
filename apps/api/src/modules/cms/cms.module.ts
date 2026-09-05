import { Module } from "@nestjs/common";
import { AdminCmsController, CmsController } from "./cms.controller";

@Module({ controllers: [CmsController, AdminCmsController] })
export class CmsModule {}

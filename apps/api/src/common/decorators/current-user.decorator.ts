import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AuthRequest } from "../interfaces/auth-user.interface";

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<AuthRequest>();
  return request.user;
});

import { applyDecorators, SetMetadata } from "@nestjs/common";
import type { RoleCodeType } from "@tripora/types";

export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export const OPTIONAL_AUTH_KEY = "optionalAuth";
export const OptionalAuth = () =>
  applyDecorators(Public(), SetMetadata(OPTIONAL_AUTH_KEY, true));

export const ROLES_KEY = "roles";
export const Roles = (...roles: RoleCodeType[]) =>
  SetMetadata(ROLES_KEY, roles);

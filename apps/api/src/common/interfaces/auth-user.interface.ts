import { Request } from "express";

export interface AuthUser {
  id: string;
  email: string | null;
  roles: string[];
  vendorId?: string;
  permissions?: string[];
  staffVendorId?: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

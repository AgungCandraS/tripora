import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, IsUUID, MinLength } from "class-validator";

export class CreateVendorDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: "Bank untuk payout" })
  @IsOptional()
  @IsString()
  bank_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bank_account_number?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bank_account_name?: string;
}

export class VendorDocumentDto {
  @ApiProperty()
  @IsString()
  type!: string;

  @ApiProperty()
  @IsString()
  object_key!: string;
}

export class CreateStaffDto {
  @ApiProperty()
  @IsUUID()
  userId!: string;

  @ApiProperty()
  @IsString()
  role_name!: string;
}

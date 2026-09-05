import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsEmail, IsInt, IsOptional, IsString, IsUUID, Matches, Min, MinLength, ValidateNested } from "class-validator";

export class BookerDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  name!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "08..." })
  @Matches(/^08[0-9]{8,12}$/, { message: "phone must start with 08" })
  phone!: string;
}

export class ParticipantDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  age?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emergency_contact?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  special_requirements?: string;
}

export class CreateBookingDto {
  @ApiProperty()
  @IsUUID()
  reservationId!: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => BookerDto)
  booker!: BookerDto;

  @ApiPropertyOptional({ type: [ParticipantDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParticipantDto)
  participants?: ParticipantDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  promotionCode?: string;

  @ApiPropertyOptional({ description: "Guest session id bound at reservation time" })
  @IsOptional()
  @IsString()
  sessionId?: string;
}

export class PricePreviewDto {
  @ApiProperty()
  @IsUUID()
  packageId!: string;

  @ApiProperty()
  @IsUUID()
  scheduleId!: string;

  @ApiProperty({ example: "2026-09-14" })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "date must be YYYY-MM-DD" })
  date!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  participants!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  promotionCode?: string;
}

export class CancelBookingDto {
  @ApiProperty({ description: "Booker email or phone (ownership proof)" })
  @IsString()
  emailOrPhone!: string;
}

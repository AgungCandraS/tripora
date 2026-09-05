import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, IsUUID, Matches, Min } from "class-validator";
import { Transform } from "class-transformer";

export class CreateReservationDto {
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
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  participants!: number;

  @ApiPropertyOptional({ description: "Guest session id (localStorage) binding the hold" })
  @IsOptional()
  @IsString()
  sessionId?: string;
}

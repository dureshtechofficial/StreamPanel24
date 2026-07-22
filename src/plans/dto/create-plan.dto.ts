import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PlanStatus } from '../enums/plan-status.enum';

export class CreatePlanDto {
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  mrp: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  customer_price: number;

  /** Discount percentage off mrp for resellers — reseller_price is computed from this, not accepted directly. */
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  reseller_percentage: number;

  /** Subscription length in days, snapshotted onto every order created from this plan. */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  duration_days: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  max_streams?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  max_connections?: number = 1;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  playback_protocols?: string[];

  @IsOptional()
  @IsBoolean()
  show_customer?: boolean = true;

  @IsOptional()
  @IsBoolean()
  show_reseller?: boolean = true;

  @IsOptional()
  @IsEnum(PlanStatus)
  status?: PlanStatus;
}

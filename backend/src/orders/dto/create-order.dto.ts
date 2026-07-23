import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentStatus } from '../enums/payment-status.enum';

export class CreateOrderDto {
  @IsString()
  @MinLength(1)
  plan_id: string;

  @IsString()
  @MinLength(1)
  stream_id: string;

  /** Required on the admin route; ignored on the reseller-scoped route (forced from the path param instead). */
  @IsOptional()
  @IsString()
  customer_id?: string;

  /** Overrides the plan's price for this order — defaults to the plan's customer_price/reseller_price if omitted. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  max_streams?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  max_connections?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  playback_protocols?: string[];

  /** Unix seconds — defaults to now if omitted. */
  @IsOptional()
  @IsInt()
  effective_from?: number;

  @IsString()
  @MinLength(1)
  payment_method: string;

  @IsOptional()
  @IsEnum(PaymentStatus)
  payment_status?: PaymentStatus;

  @IsOptional()
  @IsString()
  remark?: string;
}

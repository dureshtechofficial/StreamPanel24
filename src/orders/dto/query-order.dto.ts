import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { OrderStatus } from '../enums/order-status.enum';
import { PaymentStatus } from '../enums/payment-status.enum';

export class QueryOrderDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  /** A specific reseller's id, or the literal 'none' for direct (no-reseller) orders only. */
  @IsOptional()
  @IsString()
  resellerId?: string;

  /** Matches against order_number, customer_name, or stream_name (all snapshotted directly on the order). */
  @IsOptional()
  @IsString()
  search?: string;

  /** Filters by created_at (when the order was placed), unix seconds, inclusive. */
  @IsOptional()
  @IsInt()
  dateFrom?: number;

  @IsOptional()
  @IsInt()
  dateTo?: number;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

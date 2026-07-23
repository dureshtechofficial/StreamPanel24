import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  NotEquals,
  MaxLength,
} from 'class-validator';

export class TopupCustomerWalletDto {
  /** Positive credits the wallet; negative debits it — `CustomerWalletService.topUp` rejects a negative that would take the balance below zero. */
  @Type(() => Number)
  @IsNumber()
  @NotEquals(0, { message: 'Amount cannot be zero' })
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  remark?: string;
}

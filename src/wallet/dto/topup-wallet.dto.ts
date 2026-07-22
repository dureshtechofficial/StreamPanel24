import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';

export class TopupWalletDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.01, { message: 'Amount must be greater than zero' })
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  remark?: string;
}

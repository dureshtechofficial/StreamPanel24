import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ResellerStatus } from '../enums/reseller-status.enum';

export class QueryResellerDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ResellerStatus)
  status?: ResellerStatus;

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

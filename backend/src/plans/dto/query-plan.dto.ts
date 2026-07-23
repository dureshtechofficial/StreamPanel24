import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PlanStatus } from '../enums/plan-status.enum';

export class QueryPlanDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(PlanStatus)
  status?: PlanStatus;

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

import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryFlussonicStreamSessionDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 20;
}

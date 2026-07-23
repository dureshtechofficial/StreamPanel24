import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class QueryFlussonicServerStatDto {
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

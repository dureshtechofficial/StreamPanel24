import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryFlussonicStreamsDirectoryDto {
  @IsOptional()
  @IsString()
  search?: string;

  /** Only return streams unassigned or already assigned to this customer — used by the customer stream-assignment picker. */
  @IsOptional()
  @IsString()
  availableForCustomerId?: string;

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

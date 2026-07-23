import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { FlussonicServerStatus } from '../enums/flussonic-server-status.enum';

export class QueryFlussonicServerDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(FlussonicServerStatus)
  status?: FlussonicServerStatus;

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

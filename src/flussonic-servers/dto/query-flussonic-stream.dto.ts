import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { FlussonicStreamStatus } from '../enums/flussonic-stream-status.enum';

export class QueryFlussonicStreamDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(FlussonicStreamStatus)
  status?: FlussonicStreamStatus;

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

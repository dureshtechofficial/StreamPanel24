import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class CreateFlussonicServerStatDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  cpu_usage?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  ram_usage_mb?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  disk_usage_gb?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  network_in_mbps?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  network_out_mbps?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  active_streams?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  active_viewers?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  active_publishers?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  uptime_seconds?: number;
}

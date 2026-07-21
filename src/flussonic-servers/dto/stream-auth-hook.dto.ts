import {
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/** Shape of `on_play`/`on_publish` — both optional at the parent DTO level. */
export class StreamAuthHookDto {
  @IsString()
  @MaxLength(500)
  url: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  max_sessions?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  domains?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowed_countries?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  disallowed_countries?: string[];

  @IsOptional()
  @IsBoolean()
  soft_limitation?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  session_keys?: string[];

  @IsOptional()
  @IsObject()
  extra?: Record<string, unknown>;
}

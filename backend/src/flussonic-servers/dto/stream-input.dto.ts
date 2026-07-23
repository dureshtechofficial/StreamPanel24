import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class StreamInputDto {
  @IsString()
  @MinLength(1, { message: 'Input URL is required' })
  @MaxLength(500)
  url: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  priority?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  comment?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  source_timeout?: number;
}

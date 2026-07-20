import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiVersionTag } from '../enums/api-version-tag.enum';
import { FlussonicServerStatus } from '../enums/flussonic-server-status.enum';

export class CreateFlussonicServerDto {
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(1, { message: 'Hostname is required' })
  @MaxLength(255)
  hostname: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  domain?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @IsOptional()
  @IsBoolean()
  use_ssl?: boolean;

  @IsString()
  @MinLength(1, { message: 'API username is required' })
  @MaxLength(100)
  api_username: string;

  @IsString()
  @MinLength(1, { message: 'API password is required' })
  @MaxLength(255)
  api_password: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  api_base_path?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  api_access_token?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  flussonic_version?: string;

  @IsOptional()
  @IsEnum(ApiVersionTag)
  api_version_tag?: ApiVersionTag;

  @IsOptional()
  @IsEnum(FlussonicServerStatus)
  status?: FlussonicServerStatus;
}

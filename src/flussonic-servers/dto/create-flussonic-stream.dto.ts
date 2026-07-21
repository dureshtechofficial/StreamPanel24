import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StreamInputDto } from './stream-input.dto';
import { StreamProtocolsDto } from './stream-protocols.dto';
import { StreamAuthHookDto } from './stream-auth-hook.dto';
import { FlussonicStreamStatus } from '../enums/flussonic-stream-status.enum';

export class CreateFlussonicStreamDto {
  @IsString()
  @MinLength(1, { message: 'Name is required' })
  @MaxLength(255)
  @Matches(/^[a-zA-Z0-9/_-]+$/, {
    message:
      'Name can only contain letters, numbers, slashes, underscores, and hyphens',
  })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  comment?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsBoolean()
  static?: boolean;

  @IsOptional()
  @IsBoolean()
  disabled?: boolean;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one input is required' })
  @ValidateNested({ each: true })
  @Type(() => StreamInputDto)
  inputs: StreamInputDto[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  retry_limit?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => StreamProtocolsDto)
  protocols?: StreamProtocolsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => StreamAuthHookDto)
  on_play?: StreamAuthHookDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => StreamAuthHookDto)
  on_publish?: StreamAuthHookDto;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  ingest_domain?: string;

  @IsOptional()
  @IsEnum(FlussonicStreamStatus)
  status?: FlussonicStreamStatus;
}

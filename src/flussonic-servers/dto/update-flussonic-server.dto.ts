import { PartialType } from '@nestjs/mapped-types';
import { CreateFlussonicServerDto } from './create-flussonic-server.dto';

export class UpdateFlussonicServerDto extends PartialType(
  CreateFlussonicServerDto,
) {}

import { PartialType } from '@nestjs/mapped-types';
import { CreateFlussonicStreamDto } from './create-flussonic-stream.dto';

/** `name` is renameable — see FlussonicStreamsService.update, which PUTs the new name then deletes the old one. */
export class UpdateFlussonicStreamDto extends PartialType(
  CreateFlussonicStreamDto,
) {}

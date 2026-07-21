import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateFlussonicStreamDto } from './create-flussonic-stream.dto';

/** `name` is immutable after creation — it's baked into the Flussonic API URL; renaming means delete + recreate. */
export class UpdateFlussonicStreamDto extends PartialType(
  OmitType(CreateFlussonicStreamDto, ['name'] as const),
) {}

import { IsArray, IsString } from 'class-validator';

export class AssignCustomerStreamsDto {
  @IsArray()
  @IsString({ each: true })
  streamIds: string[];
}

import { IsBoolean } from 'class-validator';

export class UpdateOrderCancelSettingDto {
  @IsBoolean()
  enabled: boolean;
}

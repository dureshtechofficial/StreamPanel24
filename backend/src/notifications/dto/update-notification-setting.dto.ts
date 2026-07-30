import { IsBoolean } from 'class-validator';

export class UpdateNotificationSettingDto {
  @IsBoolean()
  enabled: boolean;
}

import { IsBoolean } from 'class-validator';

export class UpdateCustomerActionSettingDto {
  @IsBoolean()
  enabled: boolean;
}

import { IsEmail, MaxLength } from 'class-validator';

export class TestSmtpSettingDto {
  /** Where to send the test message. */
  @IsEmail()
  @MaxLength(255)
  to: string;
}

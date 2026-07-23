import { IsString, MinLength } from 'class-validator';

export class ResellerLoginDto {
  /** Either the reseller's phone number or their username. */
  @IsString()
  @MinLength(1, { message: 'Phone number or username is required' })
  identifier: string;

  @IsString()
  @MinLength(1, { message: 'Password is required' })
  password: string;
}

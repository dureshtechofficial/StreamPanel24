import { IsString, MinLength } from 'class-validator';

export class CustomerLoginDto {
  /** Either the customer's phone number or their username. */
  @IsString()
  @MinLength(1, { message: 'Phone number or username is required' })
  identifier: string;

  @IsString()
  @MinLength(1, { message: 'Password is required' })
  password: string;
}

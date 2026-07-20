import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CustomerStatus } from '../enums/customer-status.enum';

export class CreateCustomerDto {
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsEmail({}, { message: 'A valid email address is required' })
  @MaxLength(150)
  email?: string;

  @IsString()
  @Matches(/^[0-9+\-\s()]{6,20}$/, { message: 'Enter a valid phone number' })
  phone: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  company_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  pincode?: string;

  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;
}

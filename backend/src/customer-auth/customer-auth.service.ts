import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { StringValue } from 'ms';
import { CustomersService } from '../customers/customers.service';
import { Customer } from '../customers/entities/customer.entity';
import { CustomerStatus } from '../customers/enums/customer-status.enum';
import { CustomerLoginDto } from './dto/customer-login.dto';
import {
  CustomerAccessTokenPayload,
  CustomerRefreshTokenPayload,
} from './interfaces/customer-token-payload.interface';

@Injectable()
export class CustomerAuthService {
  constructor(
    private readonly customersService: CustomersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateCredentials(dto: CustomerLoginDto): Promise<Customer> {
    const customer = await this.customersService.findByIdentifierWithPassword(
      dto.identifier,
    );
    if (!customer || !customer.password_hash) {
      throw new UnauthorizedException(
        'Invalid phone number/username or password',
      );
    }

    if (customer.status !== CustomerStatus.ACTIVE) {
      throw new UnauthorizedException('This account has been disabled');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      customer.password_hash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException(
        'Invalid phone number/username or password',
      );
    }

    return customer;
  }

  issueAccessToken(customer: Customer): string {
    const payload: CustomerAccessTokenPayload = {
      sub: customer.id,
      type: 'customer',
    };
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.accessSecret'),
      expiresIn: this.configService.get<string>(
        'jwt.accessExpiresIn',
      ) as StringValue,
    });
  }

  issueRefreshToken(customer: Customer): string {
    const payload: CustomerRefreshTokenPayload = {
      sub: customer.id,
      type: 'customer',
    };
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: this.configService.get<string>(
        'jwt.refreshExpiresIn',
      ) as StringValue,
    });
  }
}

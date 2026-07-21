import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { CustomersService } from '../../customers/customers.service';
import { CustomerStatus } from '../../customers/enums/customer-status.enum';
import { CustomerAccessTokenPayload } from '../interfaces/customer-token-payload.interface';

@Injectable()
export class CustomerJwtAccessStrategy extends PassportStrategy(
  Strategy,
  'customer-jwt-access',
) {
  constructor(
    private readonly configService: ConfigService,
    private readonly customersService: CustomersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.accessSecret')!,
    });
  }

  async validate(payload: CustomerAccessTokenPayload) {
    if (payload.type !== 'customer') {
      throw new UnauthorizedException('Invalid token');
    }
    const customer = await this.customersService.findActiveById(payload.sub);
    if (!customer || customer.status !== CustomerStatus.ACTIVE) {
      throw new UnauthorizedException('Customer not found or inactive');
    }
    return customer;
  }
}

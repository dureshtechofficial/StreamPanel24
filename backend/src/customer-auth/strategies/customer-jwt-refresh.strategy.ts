import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-jwt';
import { CustomersService } from '../../customers/customers.service';
import { CustomerStatus } from '../../customers/enums/customer-status.enum';
import { CustomerRefreshTokenPayload } from '../interfaces/customer-token-payload.interface';
import { CUSTOMER_REFRESH_TOKEN_COOKIE } from '../utils/customer-cookie.util';

function extractRefreshTokenFromCookie(req: Request): string | null {
  return (
    (req?.cookies?.[CUSTOMER_REFRESH_TOKEN_COOKIE] as string | undefined) ??
    null
  );
}

@Injectable()
export class CustomerJwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'customer-jwt-refresh',
) {
  constructor(
    private readonly configService: ConfigService,
    private readonly customersService: CustomersService,
  ) {
    super({
      jwtFromRequest: extractRefreshTokenFromCookie,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.refreshSecret')!,
      passReqToCallback: false,
    });
  }

  async validate(payload: CustomerRefreshTokenPayload) {
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

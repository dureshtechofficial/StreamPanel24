import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-jwt';
import { ResellersService } from '../../resellers/resellers.service';
import { ResellerStatus } from '../../resellers/enums/reseller-status.enum';
import { ResellerRefreshTokenPayload } from '../interfaces/reseller-token-payload.interface';
import { RESELLER_REFRESH_TOKEN_COOKIE } from '../utils/reseller-cookie.util';

function extractRefreshTokenFromCookie(req: Request): string | null {
  return (
    (req?.cookies?.[RESELLER_REFRESH_TOKEN_COOKIE] as string | undefined) ??
    null
  );
}

@Injectable()
export class ResellerJwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'reseller-jwt-refresh',
) {
  constructor(
    private readonly configService: ConfigService,
    private readonly resellersService: ResellersService,
  ) {
    super({
      jwtFromRequest: extractRefreshTokenFromCookie,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.refreshSecret')!,
      passReqToCallback: false,
    });
  }

  async validate(payload: ResellerRefreshTokenPayload) {
    if (payload.type !== 'reseller') {
      throw new UnauthorizedException('Invalid token');
    }
    const reseller = await this.resellersService.findActiveById(payload.sub);
    if (!reseller || reseller.status !== ResellerStatus.ACTIVE) {
      throw new UnauthorizedException('Reseller not found or inactive');
    }
    return reseller;
  }
}

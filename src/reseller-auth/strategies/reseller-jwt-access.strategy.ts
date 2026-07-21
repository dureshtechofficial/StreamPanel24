import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ResellersService } from '../../resellers/resellers.service';
import { ResellerStatus } from '../../resellers/enums/reseller-status.enum';
import { ResellerAccessTokenPayload } from '../interfaces/reseller-token-payload.interface';

@Injectable()
export class ResellerJwtAccessStrategy extends PassportStrategy(
  Strategy,
  'reseller-jwt-access',
) {
  constructor(
    private readonly configService: ConfigService,
    private readonly resellersService: ResellersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.accessSecret')!,
    });
  }

  async validate(payload: ResellerAccessTokenPayload) {
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

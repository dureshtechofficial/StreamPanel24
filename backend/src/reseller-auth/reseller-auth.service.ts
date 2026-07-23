import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { StringValue } from 'ms';
import { ResellersService } from '../resellers/resellers.service';
import { Reseller } from '../resellers/entities/reseller.entity';
import { ResellerStatus } from '../resellers/enums/reseller-status.enum';
import { ResellerLoginDto } from './dto/reseller-login.dto';
import {
  ResellerAccessTokenPayload,
  ResellerRefreshTokenPayload,
} from './interfaces/reseller-token-payload.interface';

@Injectable()
export class ResellerAuthService {
  constructor(
    private readonly resellersService: ResellersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateCredentials(dto: ResellerLoginDto): Promise<Reseller> {
    const reseller = await this.resellersService.findByIdentifierWithPassword(
      dto.identifier,
    );
    if (!reseller || !reseller.password_hash) {
      throw new UnauthorizedException(
        'Invalid phone number/username or password',
      );
    }

    if (reseller.status !== ResellerStatus.ACTIVE) {
      throw new UnauthorizedException('This account has been disabled');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      reseller.password_hash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException(
        'Invalid phone number/username or password',
      );
    }

    return reseller;
  }

  issueAccessToken(reseller: Reseller): string {
    const payload: ResellerAccessTokenPayload = {
      sub: reseller.id,
      type: 'reseller',
    };
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.accessSecret'),
      expiresIn: this.configService.get<string>(
        'jwt.accessExpiresIn',
      ) as StringValue,
    });
  }

  issueRefreshToken(reseller: Reseller): string {
    const payload: ResellerRefreshTokenPayload = {
      sub: reseller.id,
      type: 'reseller',
    };
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: this.configService.get<string>(
        'jwt.refreshExpiresIn',
      ) as StringValue,
    });
  }
}

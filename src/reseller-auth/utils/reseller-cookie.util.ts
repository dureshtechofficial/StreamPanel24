import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import ms from 'ms';

export const RESELLER_REFRESH_TOKEN_COOKIE = 'reseller_refresh_token';

export function setResellerRefreshTokenCookie(
  res: Response,
  token: string,
  configService: ConfigService,
): void {
  const expiresIn = configService.get<string>('jwt.refreshExpiresIn')!;
  const maxAge = ms(expiresIn as ms.StringValue);
  const isProduction = configService.get<string>('appEnv') === 'production';

  res.cookie(RESELLER_REFRESH_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/api/v1/reseller-auth',
    maxAge,
  });
}

export function clearResellerRefreshTokenCookie(
  res: Response,
  configService: ConfigService,
): void {
  const isProduction = configService.get<string>('appEnv') === 'production';

  res.clearCookie(RESELLER_REFRESH_TOKEN_COOKIE, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/api/v1/reseller-auth',
  });
}

import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import ms from 'ms';

export const CUSTOMER_REFRESH_TOKEN_COOKIE = 'customer_refresh_token';

export function setCustomerRefreshTokenCookie(
  res: Response,
  token: string,
  configService: ConfigService,
): void {
  const expiresIn = configService.get<string>('jwt.refreshExpiresIn')!;
  const maxAge = ms(expiresIn as ms.StringValue);
  const isProduction = configService.get<string>('appEnv') === 'production';

  res.cookie(CUSTOMER_REFRESH_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    // See auth/utils/cookie.util.ts for why 'lax' rather than 'strict'.
    sameSite: 'lax',
    path: '/api/v1/customer-auth',
    maxAge,
  });
}

export function clearCustomerRefreshTokenCookie(
  res: Response,
  configService: ConfigService,
): void {
  const isProduction = configService.get<string>('appEnv') === 'production';

  res.clearCookie(CUSTOMER_REFRESH_TOKEN_COOKIE, {
    httpOnly: true,
    secure: isProduction,
    // See auth/utils/cookie.util.ts for why 'lax' rather than 'strict'.
    sameSite: 'lax',
    path: '/api/v1/customer-auth',
  });
}

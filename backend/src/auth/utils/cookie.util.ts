import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import ms from 'ms';

export const REFRESH_TOKEN_COOKIE = 'refresh_token';

export function setRefreshTokenCookie(
  res: Response,
  token: string,
  configService: ConfigService,
): void {
  const expiresIn = configService.get<string>('jwt.refreshExpiresIn')!;
  const maxAge = ms(expiresIn as ms.StringValue);
  const isProduction = configService.get<string>('appEnv') === 'production';

  res.cookie(REFRESH_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    // 'lax' rather than 'strict': the frontend and this API are served from
    // separate origins (different ports locally, different subdomains in the
    // tunnel/production setup) — same-site fetches between them should carry
    // a 'strict' cookie fine per spec, but 'lax' is the more broadly
    // compatible choice in practice across browsers/proxies for exactly this
    // split-origin shape, and still blocks genuine cross-site requests.
    sameSite: 'lax',
    path: '/api/v1/auth',
    maxAge,
  });
}

export function clearRefreshTokenCookie(
  res: Response,
  configService: ConfigService,
): void {
  const isProduction = configService.get<string>('appEnv') === 'production';

  res.clearCookie(REFRESH_TOKEN_COOKIE, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/api/v1/auth',
  });
}

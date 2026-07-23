import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class ResellerJwtRefreshGuard extends AuthGuard(
  'reseller-jwt-refresh',
) {}

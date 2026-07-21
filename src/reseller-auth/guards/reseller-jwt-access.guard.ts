import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class ResellerJwtAccessGuard extends AuthGuard('reseller-jwt-access') {}

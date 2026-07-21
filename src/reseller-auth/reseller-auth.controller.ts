import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ResellerAuthService } from './reseller-auth.service';
import { ResellerLoginDto } from './dto/reseller-login.dto';
import { ResellerJwtAccessGuard } from './guards/reseller-jwt-access.guard';
import { ResellerJwtRefreshGuard } from './guards/reseller-jwt-refresh.guard';
import { CurrentReseller } from './decorators/current-reseller.decorator';
import { Reseller } from '../resellers/entities/reseller.entity';
import {
  setResellerRefreshTokenCookie,
  clearResellerRefreshTokenCookie,
} from './utils/reseller-cookie.util';

@ApiTags('reseller-auth')
@Controller('reseller-auth')
export class ResellerAuthController {
  constructor(
    private readonly resellerAuthService: ResellerAuthService,
    private readonly configService: ConfigService,
  ) {}

  @ApiOperation({
    summary:
      'Log in with phone number or username + password, returns an access token and sets the refresh cookie',
  })
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: ResellerLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const reseller = await this.resellerAuthService.validateCredentials(dto);
    const accessToken = this.resellerAuthService.issueAccessToken(reseller);
    const refreshToken = this.resellerAuthService.issueRefreshToken(reseller);

    setResellerRefreshTokenCookie(res, refreshToken, this.configService);

    return { reseller, accessToken };
  }

  @ApiOperation({
    summary: 'Exchange the refresh cookie for a new access token',
  })
  @UseGuards(ResellerJwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(
    @CurrentReseller() reseller: Reseller,
    @Res({ passthrough: true }) res: Response,
  ) {
    const accessToken = this.resellerAuthService.issueAccessToken(reseller);
    const refreshToken = this.resellerAuthService.issueRefreshToken(reseller);

    setResellerRefreshTokenCookie(res, refreshToken, this.configService);

    return { reseller, accessToken };
  }

  @ApiOperation({ summary: 'Clear the refresh cookie' })
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    clearResellerRefreshTokenCookie(res, this.configService);
    return { message: 'Logged out successfully' };
  }

  @ApiOperation({ summary: 'Return the currently authenticated reseller' })
  @ApiBearerAuth('access-token')
  @UseGuards(ResellerJwtAccessGuard)
  @Get('me')
  me(@CurrentReseller() reseller: Reseller) {
    return { reseller };
  }
}

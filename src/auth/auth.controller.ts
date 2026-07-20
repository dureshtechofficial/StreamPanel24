import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAccessGuard } from './guards/jwt-access.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import {
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} from './utils/cookie.util';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    const user = await this.authService.register(dto);
    return { user };
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.validateCredentials(dto);
    const accessToken = this.authService.issueAccessToken(user);
    const refreshToken = this.authService.issueRefreshToken(user);

    setRefreshTokenCookie(res, refreshToken, this.configService);

    return { user, accessToken };
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ) {
    const accessToken = this.authService.issueAccessToken(user);
    const refreshToken = this.authService.issueRefreshToken(user);

    setRefreshTokenCookie(res, refreshToken, this.configService);

    return { user, accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    clearRefreshTokenCookie(res, this.configService);
    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAccessGuard)
  @Get('me')
  me(@CurrentUser() user: User) {
    return { user };
  }
}

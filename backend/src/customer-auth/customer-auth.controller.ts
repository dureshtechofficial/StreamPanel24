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
import { CustomerAuthService } from './customer-auth.service';
import { CustomerLoginDto } from './dto/customer-login.dto';
import { CustomerJwtAccessGuard } from './guards/customer-jwt-access.guard';
import { CustomerJwtRefreshGuard } from './guards/customer-jwt-refresh.guard';
import { CurrentCustomer } from './decorators/current-customer.decorator';
import { Customer } from '../customers/entities/customer.entity';
import {
  setCustomerRefreshTokenCookie,
  clearCustomerRefreshTokenCookie,
} from './utils/customer-cookie.util';

@ApiTags('customer-auth')
@Controller('customer-auth')
export class CustomerAuthController {
  constructor(
    private readonly customerAuthService: CustomerAuthService,
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
    @Body() dto: CustomerLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const customer = await this.customerAuthService.validateCredentials(dto);
    const accessToken = this.customerAuthService.issueAccessToken(customer);
    const refreshToken = this.customerAuthService.issueRefreshToken(customer);

    setCustomerRefreshTokenCookie(res, refreshToken, this.configService);

    return { customer, accessToken };
  }

  @ApiOperation({
    summary: 'Exchange the refresh cookie for a new access token',
  })
  @UseGuards(CustomerJwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(
    @CurrentCustomer() customer: Customer,
    @Res({ passthrough: true }) res: Response,
  ) {
    const accessToken = this.customerAuthService.issueAccessToken(customer);
    const refreshToken = this.customerAuthService.issueRefreshToken(customer);

    setCustomerRefreshTokenCookie(res, refreshToken, this.configService);

    return { customer, accessToken };
  }

  @ApiOperation({ summary: 'Clear the refresh cookie' })
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    clearCustomerRefreshTokenCookie(res, this.configService);
    return { message: 'Logged out successfully' };
  }

  @ApiOperation({ summary: 'Return the currently authenticated customer' })
  @ApiBearerAuth('access-token')
  @UseGuards(CustomerJwtAccessGuard)
  @Get('me')
  me(@CurrentCustomer() customer: Customer) {
    return { customer };
  }
}

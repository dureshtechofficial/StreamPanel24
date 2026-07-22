import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { StringValue } from 'ms';
import { CustomersModule } from '../customers/customers.module';
import { FlussonicServersModule } from '../flussonic-servers/flussonic-servers.module';
import { PlansModule } from '../plans/plans.module';
import { OrdersModule } from '../orders/orders.module';
import { SettingsModule } from '../settings/settings.module';
import { CustomerAuthService } from './customer-auth.service';
import { CustomerAuthController } from './customer-auth.controller';
import { CustomerStreamsPortalController } from './customer-streams.controller';
import { CustomerPlansController } from './customer-plans.controller';
import { CustomerOrdersController } from './customer-orders.controller';
import { CustomerSettingsController } from './customer-settings.controller';
import { CustomerJwtAccessStrategy } from './strategies/customer-jwt-access.strategy';
import { CustomerJwtRefreshStrategy } from './strategies/customer-jwt-refresh.strategy';

@Module({
  imports: [
    CustomersModule,
    FlussonicServersModule,
    PlansModule,
    OrdersModule,
    SettingsModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.accessSecret'),
        signOptions: {
          expiresIn: configService.get<string>(
            'jwt.accessExpiresIn',
          ) as StringValue,
        },
      }),
    }),
  ],
  controllers: [
    CustomerAuthController,
    CustomerStreamsPortalController,
    CustomerPlansController,
    CustomerOrdersController,
    CustomerSettingsController,
  ],
  providers: [
    CustomerAuthService,
    CustomerJwtAccessStrategy,
    CustomerJwtRefreshStrategy,
  ],
  exports: [CustomerAuthService],
})
export class CustomerAuthModule {}

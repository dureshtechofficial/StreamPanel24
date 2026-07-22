import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { StringValue } from 'ms';
import { ResellersModule } from '../resellers/resellers.module';
import { CustomersModule } from '../customers/customers.module';
import { FlussonicServersModule } from '../flussonic-servers/flussonic-servers.module';
import { PlansModule } from '../plans/plans.module';
import { OrdersModule } from '../orders/orders.module';
import { SettingsModule } from '../settings/settings.module';
import { WalletModule } from '../wallet/wallet.module';
import { ResellerAuthService } from './reseller-auth.service';
import { ResellerAuthController } from './reseller-auth.controller';
import { ResellerCustomersController } from './reseller-customers.controller';
import { ResellerCustomerStreamsController } from './reseller-customer-streams.controller';
import { ResellerPlansController } from './reseller-plans.controller';
import { ResellerOrdersController } from './reseller-orders.controller';
import { ResellerSettingsController } from './reseller-settings.controller';
import { ResellerWalletController } from './reseller-wallet.controller';
import { ResellerJwtAccessStrategy } from './strategies/reseller-jwt-access.strategy';
import { ResellerJwtRefreshStrategy } from './strategies/reseller-jwt-refresh.strategy';

@Module({
  imports: [
    ResellersModule,
    CustomersModule,
    FlussonicServersModule,
    PlansModule,
    OrdersModule,
    SettingsModule,
    WalletModule,
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
    ResellerAuthController,
    ResellerCustomersController,
    ResellerCustomerStreamsController,
    ResellerPlansController,
    ResellerOrdersController,
    ResellerSettingsController,
    ResellerWalletController,
  ],
  providers: [
    ResellerAuthService,
    ResellerJwtAccessStrategy,
    ResellerJwtRefreshStrategy,
  ],
  exports: [ResellerAuthService],
})
export class ResellerAuthModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PlansModule } from '../plans/plans.module';
import { CustomersModule } from '../customers/customers.module';
import { ResellersModule } from '../resellers/resellers.module';
import { FlussonicServersModule } from '../flussonic-servers/flussonic-servers.module';
import { SettingsModule } from '../settings/settings.module';
import { WalletModule } from '../wallet/wallet.module';
import { CustomerWalletModule } from '../customer-wallet/customer-wallet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order]),
    PlansModule,
    CustomersModule,
    ResellersModule,
    FlussonicServersModule,
    SettingsModule,
    WalletModule,
    CustomerWalletModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}

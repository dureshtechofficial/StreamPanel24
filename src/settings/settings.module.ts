import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SyncSchedule } from './entities/sync-schedule.entity';
import { SyncScheduleRun } from './entities/sync-schedule-run.entity';
import { OrderCancelSetting } from './entities/order-cancel-setting.entity';
import { CustomerActionSetting } from './entities/customer-action-setting.entity';
import { WalletTopupSetting } from './entities/wallet-topup-setting.entity';
import { Order } from '../orders/entities/order.entity';
import { SyncScheduleService } from './sync-schedule.service';
import { OrderCancelSettingsService } from './order-cancel-settings.service';
import { CustomerActionSettingsService } from './customer-action-settings.service';
import { WalletTopupSettingsService } from './wallet-topup-settings.service';
import { OrderExpiryService } from '../orders/order-expiry.service';
import { SettingsController } from './settings.controller';
import { OrderCancelSettingsController } from './order-cancel-settings.controller';
import { CustomerActionSettingsController } from './customer-action-settings.controller';
import { WalletTopupSettingsController } from './wallet-topup-settings.controller';
import { FlussonicServersModule } from '../flussonic-servers/flussonic-servers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SyncSchedule,
      SyncScheduleRun,
      OrderCancelSetting,
      CustomerActionSetting,
      WalletTopupSetting,
      // Registered here (not imported via OrdersModule) so OrderExpiryService
      // can be wired into SyncScheduleService — OrdersModule already imports
      // SettingsModule for OrderCancelSettingsService, so importing OrdersModule
      // back here would be circular. Same "touch a foreign entity directly to
      // break a cycle" pattern as SyncScheduleGateService in flussonic-servers.
      Order,
    ]),
    FlussonicServersModule,
  ],
  controllers: [
    SettingsController,
    OrderCancelSettingsController,
    CustomerActionSettingsController,
    WalletTopupSettingsController,
  ],
  providers: [
    SyncScheduleService,
    OrderCancelSettingsService,
    CustomerActionSettingsService,
    WalletTopupSettingsService,
    OrderExpiryService,
  ],
  exports: [
    OrderCancelSettingsService,
    CustomerActionSettingsService,
    WalletTopupSettingsService,
  ],
})
export class SettingsModule {}

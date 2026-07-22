import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SyncSchedule } from './entities/sync-schedule.entity';
import { SyncScheduleRun } from './entities/sync-schedule-run.entity';
import { OrderCancelSetting } from './entities/order-cancel-setting.entity';
import { CustomerActionSetting } from './entities/customer-action-setting.entity';
import { SyncScheduleService } from './sync-schedule.service';
import { OrderCancelSettingsService } from './order-cancel-settings.service';
import { CustomerActionSettingsService } from './customer-action-settings.service';
import { SettingsController } from './settings.controller';
import { OrderCancelSettingsController } from './order-cancel-settings.controller';
import { CustomerActionSettingsController } from './customer-action-settings.controller';
import { FlussonicServersModule } from '../flussonic-servers/flussonic-servers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SyncSchedule,
      SyncScheduleRun,
      OrderCancelSetting,
      CustomerActionSetting,
    ]),
    FlussonicServersModule,
  ],
  controllers: [
    SettingsController,
    OrderCancelSettingsController,
    CustomerActionSettingsController,
  ],
  providers: [
    SyncScheduleService,
    OrderCancelSettingsService,
    CustomerActionSettingsService,
  ],
  exports: [OrderCancelSettingsService, CustomerActionSettingsService],
})
export class SettingsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlussonicServer } from './entities/flussonic-server.entity';
import { FlussonicServerStat } from './entities/flussonic-server-stat.entity';
import { FlussonicStream } from './entities/flussonic-stream.entity';
import { SyncSchedule } from '../settings/entities/sync-schedule.entity';
import { Order } from '../orders/entities/order.entity';
import { Customer } from '../customers/entities/customer.entity';
import { FlussonicServersService } from './flussonic-servers.service';
import { FlussonicServersController } from './flussonic-servers.controller';
import { FlussonicServerStatsService } from './flussonic-server-stats.service';
import { FlussonicServerStatsController } from './flussonic-server-stats.controller';
import { FlussonicStreamsService } from './flussonic-streams.service';
import { FlussonicStreamsController } from './flussonic-streams.controller';
import { FlussonicStreamsDirectoryController } from './flussonic-streams-directory.controller';
import { FlussonicStreamSessionsService } from './flussonic-stream-sessions.service';
import { FlussonicStreamSessionsController } from './flussonic-stream-sessions.controller';
import { FlussonicSyncAllService } from './flussonic-sync-all.service';
import { SyncScheduleGateService } from './sync-schedule-gate.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    NotificationsModule,
    TypeOrmModule.forFeature([
      FlussonicServer,
      FlussonicServerStat,
      FlussonicStream,
      SyncSchedule,
      // Registered here (not via OrdersModule) so FlussonicStreamsService can
      // compute has_active_order — OrdersModule already imports
      // FlussonicServersModule, so importing OrdersModule back would be
      // circular. Same "touch a foreign entity directly to break a cycle"
      // pattern as SyncSchedule above and OrderExpiryService in SettingsModule.
      Order,
      // Registered here (not via CustomersModule) so the stream directory can
      // resolve the owning customer's name for the assignment picker without a
      // circular module import.
      Customer,
    ]),
  ],
  controllers: [
    FlussonicServersController,
    FlussonicServerStatsController,
    FlussonicStreamsController,
    FlussonicStreamsDirectoryController,
    FlussonicStreamSessionsController,
  ],
  providers: [
    FlussonicServersService,
    FlussonicServerStatsService,
    FlussonicStreamsService,
    FlussonicStreamSessionsService,
    FlussonicSyncAllService,
    SyncScheduleGateService,
  ],
  exports: [
    FlussonicServersService,
    FlussonicServerStatsService,
    FlussonicStreamsService,
    FlussonicStreamSessionsService,
  ],
})
export class FlussonicServersModule {}

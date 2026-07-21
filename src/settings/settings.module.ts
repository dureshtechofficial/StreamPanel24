import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SyncSchedule } from './entities/sync-schedule.entity';
import { SyncScheduleService } from './sync-schedule.service';
import { SettingsController } from './settings.controller';
import { FlussonicServersModule } from '../flussonic-servers/flussonic-servers.module';

@Module({
  imports: [TypeOrmModule.forFeature([SyncSchedule]), FlussonicServersModule],
  controllers: [SettingsController],
  providers: [SyncScheduleService],
})
export class SettingsModule {}

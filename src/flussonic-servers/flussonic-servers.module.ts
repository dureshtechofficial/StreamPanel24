import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlussonicServer } from './entities/flussonic-server.entity';
import { FlussonicServerStat } from './entities/flussonic-server-stat.entity';
import { FlussonicServersService } from './flussonic-servers.service';
import { FlussonicServersController } from './flussonic-servers.controller';
import { FlussonicServerStatsService } from './flussonic-server-stats.service';
import { FlussonicServerStatsController } from './flussonic-server-stats.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FlussonicServer, FlussonicServerStat])],
  controllers: [FlussonicServersController, FlussonicServerStatsController],
  providers: [FlussonicServersService, FlussonicServerStatsService],
  exports: [FlussonicServersService, FlussonicServerStatsService],
})
export class FlussonicServersModule {}

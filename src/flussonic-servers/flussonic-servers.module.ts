import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlussonicServer } from './entities/flussonic-server.entity';
import { FlussonicServerStat } from './entities/flussonic-server-stat.entity';
import { FlussonicStream } from './entities/flussonic-stream.entity';
import { FlussonicServersService } from './flussonic-servers.service';
import { FlussonicServersController } from './flussonic-servers.controller';
import { FlussonicServerStatsService } from './flussonic-server-stats.service';
import { FlussonicServerStatsController } from './flussonic-server-stats.controller';
import { FlussonicStreamsService } from './flussonic-streams.service';
import { FlussonicStreamsController } from './flussonic-streams.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FlussonicServer,
      FlussonicServerStat,
      FlussonicStream,
    ]),
  ],
  controllers: [
    FlussonicServersController,
    FlussonicServerStatsController,
    FlussonicStreamsController,
  ],
  providers: [
    FlussonicServersService,
    FlussonicServerStatsService,
    FlussonicStreamsService,
  ],
  exports: [
    FlussonicServersService,
    FlussonicServerStatsService,
    FlussonicStreamsService,
  ],
})
export class FlussonicServersModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlussonicServer } from './entities/flussonic-server.entity';
import { FlussonicServerStat } from './entities/flussonic-server-stat.entity';
import { FlussonicStream } from './entities/flussonic-stream.entity';
import { FlussonicStreamSession } from './entities/flussonic-stream-session.entity';
import { FlussonicServersService } from './flussonic-servers.service';
import { FlussonicServersController } from './flussonic-servers.controller';
import { FlussonicServerStatsService } from './flussonic-server-stats.service';
import { FlussonicServerStatsController } from './flussonic-server-stats.controller';
import { FlussonicStreamsService } from './flussonic-streams.service';
import { FlussonicStreamsController } from './flussonic-streams.controller';
import { FlussonicStreamSessionsService } from './flussonic-stream-sessions.service';
import { FlussonicStreamSessionsController } from './flussonic-stream-sessions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FlussonicServer,
      FlussonicServerStat,
      FlussonicStream,
      FlussonicStreamSession,
    ]),
  ],
  controllers: [
    FlussonicServersController,
    FlussonicServerStatsController,
    FlussonicStreamsController,
    FlussonicStreamSessionsController,
  ],
  providers: [
    FlussonicServersService,
    FlussonicServerStatsService,
    FlussonicStreamsService,
    FlussonicStreamSessionsService,
  ],
  exports: [
    FlussonicServersService,
    FlussonicServerStatsService,
    FlussonicStreamsService,
    FlussonicStreamSessionsService,
  ],
})
export class FlussonicServersModule {}

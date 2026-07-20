import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlussonicServer } from './entities/flussonic-server.entity';
import { FlussonicServersService } from './flussonic-servers.service';
import { FlussonicServersController } from './flussonic-servers.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FlussonicServer])],
  controllers: [FlussonicServersController],
  providers: [FlussonicServersService],
  exports: [FlussonicServersService],
})
export class FlussonicServersModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventStreamingService } from './event-streaming.service';
import { EventStreamingController } from './event-streaming.controller';
import { EventStream } from '../../entities';
import { RedisModule } from '../../config';

@Module({
  imports: [
    TypeOrmModule.forFeature([EventStream]),
    RedisModule,
  ],
  controllers: [EventStreamingController],
  providers: [EventStreamingService],
  exports: [EventStreamingService],
})
export class EventStreamingModule {}

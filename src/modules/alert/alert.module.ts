import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertService } from './alert.service';
import { AlertController } from './alert.controller';
import { Alert } from '../../entities';
import { RedisModule } from '../../config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Alert]),
    RedisModule,
  ],
  controllers: [AlertController],
  providers: [AlertService],
  exports: [AlertService],
})
export class AlertModule {}

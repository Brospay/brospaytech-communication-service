import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplateService } from './template.service';
import { TemplateController } from './template.controller';
import { NotificationTemplate } from '../../entities';
import { RedisModule } from '../../config';

/**
 * Template Module
 * Handles notification template management and rendering
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationTemplate]),
    RedisModule,
  ],
  controllers: [TemplateController],
  providers: [TemplateService],
  exports: [TemplateService],
})
export class TemplateModule {}

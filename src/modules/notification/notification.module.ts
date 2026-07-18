import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { Notification, NotificationTemplate } from '../../entities';
import { RedisModule } from '../../config';
import { 
  EmailNotificationService, 
  SmsNotificationService, 
  TelegramNotificationService, 
  PushNotificationService,
  TemplateRendererService,
  TemplateLoaderService,
} from './providers';

/**
 * Notification Module
 * Handles multi-channel notification delivery and management
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, NotificationTemplate]),
    RedisModule,
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    EmailNotificationService,
    SmsNotificationService,
    TelegramNotificationService,
    PushNotificationService,
    TemplateRendererService,
    TemplateLoaderService,
  ],
  exports: [
    NotificationService,
    EmailNotificationService,
    SmsNotificationService,
    TelegramNotificationService,
    PushNotificationService,
    TemplateRendererService,
    TemplateLoaderService,
  ],
})
export class NotificationModule {}

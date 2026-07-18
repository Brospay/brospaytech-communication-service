import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhookService } from './webhook.service';
import { WebhookController } from './webhook.controller';
import { WebhookDeliveryWorker } from './webhook-delivery.worker';
import { WebhookEvent, WebhookDelivery, WebhookEndpoint } from '../../entities';
import { RedisModule } from '../../config';
import { WebhookDeduplicationService } from '../../utils';

/**
 * Webhook Module
 * Handles outbound webhook delivery to merchant servers with retry mechanisms
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([WebhookEvent, WebhookDelivery, WebhookEndpoint]),
    RedisModule,
  ],
  controllers: [WebhookController],
  providers: [
    WebhookService, 
    WebhookDeliveryWorker, 
    WebhookDeduplicationService
  ],
  exports: [
    WebhookService, 
    WebhookDeliveryWorker, 
    WebhookDeduplicationService
  ],
})
export class WebhookModule {}

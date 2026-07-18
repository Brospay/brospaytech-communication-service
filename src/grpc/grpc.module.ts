import { Module } from '@nestjs/common';
import { CommunicationGrpcService } from './communication.service';
import { WebhookModule } from '../modules/webhook/webhook.module';
import { NotificationModule } from '../modules/notification/notification.module';
import { EventStreamingModule } from '../modules/event-streaming/event-streaming.module';
import { AlertModule } from '../modules/alert/alert.module';

/**
 * gRPC Module
 * Provides gRPC service implementation for inter-service communication
 */
@Module({
  imports: [
    WebhookModule,
    NotificationModule,
    EventStreamingModule,
    AlertModule,
  ],
  controllers: [CommunicationGrpcService],
  providers: [CommunicationGrpcService],
  exports: [CommunicationGrpcService],
})
export class GrpcModule {}

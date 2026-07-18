import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Configuration modules
import { AppConfigModule, DatabaseModule, RedisModule } from './config';

// Feature modules
import { WebhookModule } from './modules/webhook/webhook.module';
import { NotificationModule } from './modules/notification/notification.module';
import { TemplateModule } from './modules/template/template.module';
import { EventStreamingModule } from './modules/event-streaming/event-streaming.module';
import { AlertModule } from './modules/alert/alert.module';
import { HealthModule } from './modules/health/health.module';

// gRPC module
import { GrpcModule } from './grpc/grpc.module';

// Common modules (guards, decorators, etc.)
import { InternalServiceGuard, CombinedAuthGuard } from './common';

/**
 * Communication Service Main Application Module
 * 
 * Handles:
 * - Outbound webhook delivery to merchant servers with retry mechanisms
 * - Multi-channel notification delivery (Email, SMS, Push, Telegram)
 * - Real-time event streaming with Kafka integration and WebSocket broadcasting
 * - Template management and rendering
 * - Alert management and escalation
 * - gRPC inter-service communication
 * - Payment Engine integration for automatic webhook triggers
 */
@Module({
  imports: [
    // Configuration
    AppConfigModule,
    DatabaseModule,
    RedisModule,
    ScheduleModule.forRoot(), // Enable cron jobs

    // Core functionality
    WebhookModule,
    NotificationModule,
    TemplateModule,
    EventStreamingModule,
    AlertModule,

    // gRPC
    GrpcModule,

    // System
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    InternalServiceGuard,
    CombinedAuthGuard,
  ],
})
export class AppModule {}
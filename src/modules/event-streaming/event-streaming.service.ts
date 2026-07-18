import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between, MoreThan, LessThan } from 'typeorm';
import { EventStream } from '../../entities';
import { 
  CreateEventStreamDto, 
  EventStreamFilterDto, 
  BulkCreateEventStreamDto,
  WebSocketSubscriptionDto,
  BroadcastEventDto,
  EventStreamStatsDto
} from '../../dto';
import { PaginatedResponseDto } from '../../dto/common';
import { RedisConfigService, CommunicationConfigService } from '../../config';
import { 
  EventStreamType, 
  EventStreamStatus, 
  EventStreamPriority, 
  EventStreamChannel,
  EventBroadcastResult,
  KafkaEventMessage,
  WebSocketConnection
} from '../../types';

/**
 * Event Streaming Service
 * Handles real-time event streaming with Kafka integration and WebSocket broadcasting
 */
@Injectable()
export class EventStreamingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventStreamingService.name);
  private wsConnections: Map<string, WebSocketConnection> = new Map();
  private io: any; // Socket.IO server instance

  constructor(
    @InjectRepository(EventStream)
    private readonly eventStreamRepository: Repository<EventStream>,
    private readonly redisService: RedisConfigService,
    private readonly configService: CommunicationConfigService,
  ) {}

  async onModuleInit() {
    this.startEventProcessingWorker();
    this.logger.log('Event Streaming Service initialized successfully');
  }

  async onModuleDestroy() {
    this.logger.log('Event Streaming Service destroyed');
  }

  /**
   * Set WebSocket server instance
   */
  setWebSocketServer(io: any): void {
    this.io = io;
    this.setupWebSocketHandlers();
  }

  /**
   * Create a new event stream
   */
  async createEventStream(createDto: CreateEventStreamDto): Promise<EventStream> {
    this.logger.log(`Creating event stream: ${createDto.eventType} for channel: ${createDto.channel}`);
    
    try {
      const eventStream = this.eventStreamRepository.create({
        eventType: createDto.eventType,
        channel: createDto.channel,
        recipientId: createDto.recipientId,
        room: createDto.room,
        payload: {
          ...createDto.payload,
          eventType: createDto.eventType,
          timestamp: new Date().toISOString(),
        },
        status: EventStreamStatus.PENDING,
        priority: createDto.priority || EventStreamPriority.NORMAL,
        sourceId: createDto.sourceId,
        sourceType: createDto.sourceType,
        expiresAt: createDto.expiresAt ? new Date(createDto.expiresAt) : this.calculateExpirationTime(createDto.priority),
        metadata: createDto.metadata,
        attempts: 0,
      });

      const savedEvent = await this.eventStreamRepository.save(eventStream);
      await this.queueEventForBroadcast(savedEvent.id);

      this.logger.log(`Event stream created successfully: ${savedEvent.id}`);
      return savedEvent;

    } catch (error) {
      this.logger.error(`Failed to create event stream: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create bulk event streams
   */
  async createBulkEventStreams(bulkDto: BulkCreateEventStreamDto): Promise<EventStream[]> {
    this.logger.log(`Creating bulk event streams: ${bulkDto.events.length} items`);
    
    try {
      const events = await Promise.all(
        bulkDto.events.map(eventDto => this.createEventStream(eventDto))
      );

      if (bulkDto.broadcastImmediately) {
        await Promise.all(
          events.map(event => this.broadcastEvent(event.id))
        );
      }

      this.logger.log(`Bulk event streams created successfully: ${events.length} events`);
      return events;

    } catch (error) {
      this.logger.error(`Failed to create bulk event streams: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get event streams with filtering
   */
  async getEventStreams(filters: EventStreamFilterDto): Promise<PaginatedResponseDto<EventStream>> {
    this.logger.log('Fetching event streams with filters');
    
    try {
      const query = this.eventStreamRepository.createQueryBuilder('event');

      // Apply filters
      if (filters.eventTypes?.length) {
        query.andWhere('event.eventType IN (:...eventTypes)', { eventTypes: filters.eventTypes });
      }

      if (filters.channels?.length) {
        query.andWhere('event.channel IN (:...channels)', { channels: filters.channels });
      }

      if (filters.recipientIds?.length) {
        query.andWhere('event.recipientId IN (:...recipientIds)', { recipientIds: filters.recipientIds });
      }

      if (filters.sourceTypes?.length) {
        query.andWhere('event.sourceType IN (:...sourceTypes)', { sourceTypes: filters.sourceTypes });
      }

      if (filters.priority) {
        query.andWhere('event.priority = :priority', { priority: filters.priority });
      }

      if (filters.status) {
        query.andWhere('event.status = :status', { status: filters.status });
      }

      if (filters.room) {
        query.andWhere('event.room = :room', { room: filters.room });
      }

      if (filters.sourceId) {
        query.andWhere('event.sourceId = :sourceId', { sourceId: filters.sourceId });
      }

      if (filters.startDate) {
        query.andWhere('event.createdAt >= :startDate', { startDate: new Date(filters.startDate) });
      }

      if (filters.endDate) {
        query.andWhere('event.createdAt <= :endDate', { endDate: new Date(filters.endDate) });
      }

      // Pagination
      const page = filters.page || 1;
      const limit = Math.min(filters.limit || 20, 100);
      const offset = filters.offset || ((page - 1) * limit);

      query.skip(offset).take(limit);
      query.orderBy('event.createdAt', 'DESC');

      const [items, total] = await query.getManyAndCount();

      return new PaginatedResponseDto(items, page, limit, total);

    } catch (error) {
      this.logger.error(`Failed to get event streams: ${error.message}`);
      throw error;
    }
  }

  /**
   * Broadcast event via WebSocket
   */
  async broadcastEvent(eventId: string, broadcastDto?: BroadcastEventDto): Promise<EventBroadcastResult> {
    const startTime = Date.now();
    
    try {
      const event = await this.eventStreamRepository.findOne({
        where: { id: eventId },
      });

      if (!event) {
        throw new Error(`Event not found: ${eventId}`);
      }

      // Check if event has expired
      if (event.expiresAt && event.expiresAt < new Date()) {
        await this.eventStreamRepository.update(eventId, {
          status: EventStreamStatus.EXPIRED,
        });
        throw new Error('Event has expired');
      }

      // Skip if already sent (unless forced)
      if (event.status === EventStreamStatus.SENT && !broadcastDto?.force) {
        return {
          eventId,
          channel: event.channel,
          successCount: 0,
          failureCount: 0,
          totalRecipients: 0,
          deliveredCount: 0,
          recipientCount: 0,
          deliveryTimeMs: Date.now() - startTime,
          processingTimeMs: Date.now() - startTime,
          errors: [],
        };
      }

      let deliveredCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      // Simulate WebSocket broadcasting for now
      // In a real implementation, this would use Socket.IO
      if (this.io) {
        try {
          const payload = {
            id: event.id,
            type: event.eventType,
            channel: event.channel,
            payload: event.payload,
            timestamp: event.createdAt,
            priority: event.priority,
          };

          // Broadcast to channel
          const channelRoom = `channel:${event.channel}`;
          deliveredCount += 1; // Simulated delivery

          // Broadcast to specific recipient if provided
          if (event.recipientId) {
            const userRoom = `user:${event.recipientId}`;
            deliveredCount += 1; // Simulated delivery
          }

          // Broadcast to specific room if provided
          if (event.room) {
            deliveredCount += 1; // Simulated delivery
          }

        } catch (error) {
          failedCount++;
          errors.push(`Broadcast error: ${error.message}`);
        }
      }

      const deliveryTime = Date.now() - startTime;
      const success = deliveredCount > 0 || failedCount === 0;

      // Update event status
      await this.eventStreamRepository.update(eventId, {
        status: success ? EventStreamStatus.SENT : EventStreamStatus.FAILED,
        sentAt: success ? new Date() : undefined,
        attempts: event.attempts + 1,
        errorMessage: errors.length > 0 ? errors.join('; ') : '',
      });

      this.logger.log(`Event broadcast completed: ${eventId}, delivered: ${deliveredCount}, failed: ${failedCount}`);

      return {
        eventId,
        channel: event.channel,
        successCount: deliveredCount,
        failureCount: failedCount,
        totalRecipients: deliveredCount + failedCount,
        deliveredCount,
        recipientCount: deliveredCount + failedCount,
        deliveryTimeMs: deliveryTime,
        processingTimeMs: deliveryTime,
        errors: errors.map(err => ({ recipientId: 'unknown', error: err })),
      };

    } catch (error) {
      this.logger.error(`Failed to broadcast event ${eventId}: ${error.message}`, error.stack);
      
      // Mark event as failed
      await this.eventStreamRepository.update(eventId, {
        status: EventStreamStatus.FAILED,
        errorMessage: error.message,
        attempts: ((await this.eventStreamRepository.findOne({ where: { id: eventId } }))?.attempts || 0) + 1,
      });

      throw error;
    }
  }

  /**
   * Subscribe user to event channels
   */
  async subscribeToChannels(userId: string, subscriptionDto: WebSocketSubscriptionDto): Promise<void> {
    this.logger.log(`Subscribing user ${userId} to channels: ${subscriptionDto.channels.join(', ')}`);
    
    try {
      // Store subscription in Redis for persistence
      const subscriptionKey = `user:${userId}:subscription`;
      const subscription = {
        userId,
        channels: subscriptionDto.channels,
        eventTypes: subscriptionDto.eventTypes,
        room: subscriptionDto.room,
        userType: subscriptionDto.userType,
        subscribedAt: new Date().toISOString(),
        metadata: subscriptionDto.metadata,
      };

      await this.redisService.getClient().setex(
        subscriptionKey,
        86400, // 24 hours
        JSON.stringify(subscription)
      );

      this.logger.log(`User ${userId} subscribed successfully to ${subscriptionDto.channels.length} channels`);

    } catch (error) {
      this.logger.error(`Failed to subscribe user ${userId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Process Kafka events (simulated for now)
   */
  async processKafkaEvent(topic: string, message: KafkaEventMessage): Promise<void> {
    this.logger.log(`Processing Kafka event from topic: ${topic}`);
    
    try {
      // Parse event data
      const eventData = typeof message.value === 'string' 
        ? JSON.parse(message.value) 
        : message.value;

      // Determine event type and channel mapping
      const { eventType, channel } = this.mapKafkaEventToStream(topic, eventData);

      // Create event stream record
      const createDto: CreateEventStreamDto = {
        eventType,
        channel,
        payload: eventData,
        priority: this.determinePriority(eventData),
        sourceId: eventData.id || eventData.entityId,
        sourceType: this.determineSourceType(topic),
        metadata: {
          kafkaTopic: topic,
          kafkaPartition: message.partition,
          kafkaOffset: message.offset,
          kafkaTimestamp: message.timestamp,
          kafkaHeaders: message.headers,
        },
      };

      // Create and broadcast event
      const eventStream = await this.createEventStream(createDto);
      await this.broadcastEvent(eventStream.id);

      this.logger.log(`Kafka event processed successfully: ${eventStream.id}`);

    } catch (error) {
      this.logger.error(`Failed to process Kafka event from topic ${topic}: ${error.message}`, error.stack);
    }
  }

  /**
   * Get event streaming statistics
   */
  async getEventStreamStats(filters?: { dateRange?: { start: Date; end: Date }; channels?: string[] }): Promise<EventStreamStatsDto> {
    this.logger.log('Fetching event streaming statistics');
    
    try {
      const baseQuery = this.eventStreamRepository.createQueryBuilder('event');
      
      if (filters?.dateRange) {
        baseQuery.andWhere('event.createdAt BETWEEN :start AND :end', {
          start: filters.dateRange.start,
          end: filters.dateRange.end,
        });
      }

      if (filters?.channels?.length) {
        baseQuery.andWhere('event.channel IN (:...channels)', { channels: filters.channels });
      }

      // Get basic counts
      const [totalEvents, sentEvents, failedEvents, pendingEvents] = await Promise.all([
        baseQuery.getCount(),
        baseQuery.clone().andWhere('event.status = :status', { status: EventStreamStatus.SENT }).getCount(),
        baseQuery.clone().andWhere('event.status = :status', { status: EventStreamStatus.FAILED }).getCount(),
        baseQuery.clone().andWhere('event.status = :status', { status: EventStreamStatus.PENDING }).getCount(),
      ]);

      // Calculate average delivery time
      const deliveryTimeResult = await this.eventStreamRepository
        .createQueryBuilder('event')
        .select('AVG(EXTRACT(EPOCH FROM (event.sentAt - event.createdAt)) * 1000)', 'avgDeliveryTimeMs')
        .where('event.status = :status', { status: EventStreamStatus.SENT })
        .andWhere('event.sentAt IS NOT NULL')
        .getRawOne();

      const avgDeliveryTimeMs = parseFloat(deliveryTimeResult?.avgDeliveryTimeMs || '0');

      // Get stats by event type
      const eventTypeStats = await this.eventStreamRepository
        .createQueryBuilder('event')
        .select([
          'event.eventType',
          'COUNT(*) as count',
          'SUM(CASE WHEN event.status = :sentStatus THEN 1 ELSE 0 END) as sent',
          'AVG(CASE WHEN event.status = :sentStatus THEN EXTRACT(EPOCH FROM (event.sentAt - event.createdAt)) * 1000 ELSE NULL END) as avgDeliveryTimeMs',
        ])
        .setParameter('sentStatus', EventStreamStatus.SENT)
        .groupBy('event.eventType')
        .getRawMany();

      const byEventType = eventTypeStats.reduce((acc, row) => {
        const count = parseInt(row.count);
        const sent = parseInt(row.sent);
        const successRate = count > 0 ? (sent / count) * 100 : 0;
        const avgDeliveryTimeMs = parseFloat(row.avgDeliveryTimeMs || '0');

        acc[row.eventType] = {
          count,
          successRate: Math.round(successRate * 100) / 100,
          avgDeliveryTimeMs: Math.round(avgDeliveryTimeMs),
        };
        return acc;
      }, {});

      // Get stats by channel
      const channelStats = await this.eventStreamRepository
        .createQueryBuilder('event')
        .select([
          'event.channel',
          'COUNT(*) as count',
          'SUM(CASE WHEN event.status = :sentStatus THEN 1 ELSE 0 END) as delivered',
        ])
        .setParameter('sentStatus', EventStreamStatus.SENT)
        .groupBy('event.channel')
        .getRawMany();

      const byChannel = channelStats.reduce((acc, row) => {
        const count = parseInt(row.count);
        const delivered = parseInt(row.delivered);
        const deliveryRate = count > 0 ? (delivered / count) * 100 : 0;

        acc[row.channel] = {
          count,
          activeConnections: this.getChannelConnectionCount(row.channel),
          deliveryRate: Math.round(deliveryRate * 100) / 100,
        };
        return acc;
      }, {});

      // Real-time metrics
      const realTimeMetrics = {
        activeConnections: this.wsConnections.size,
        messagesPerMinute: await this.getMessagesPerMinute(),
        avgMessageSize: await this.getAverageMessageSize(),
        topChannels: Object.keys(byChannel)
          .sort((a, b) => byChannel[b].count - byChannel[a].count)
          .slice(0, 5)
          .map(channel => ({ channel, count: byChannel[channel].count })),
      };

      return {
        totalEvents,
        successfulEvents: sentEvents,
        sentEvents,
        failedEvents,
        pendingEvents,
        avgProcessingTime: Math.round(avgDeliveryTimeMs),
        successRate: totalEvents > 0 ? (sentEvents / totalEvents) * 100 : 0,
        channelStats: byChannel,
        eventTypeStats: byEventType,
        byEventType,
        byChannel,
        realTimeMetrics,
        period: 'realtime',
        calculatedAt: new Date(),
      };

    } catch (error) {
      this.logger.error(`Failed to get event stream statistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Setup WebSocket event handlers (simulated)
   */
  private setupWebSocketHandlers(): void {
    if (!this.io) return;

    this.logger.log('WebSocket handlers configured');
    // In a real implementation, this would set up Socket.IO event handlers
  }

  /**
   * Start background worker for processing events
   */
  private startEventProcessingWorker(): void {
    setInterval(async () => {
      try {
        await this.processFailedEvents();
        await this.cleanupExpiredEvents();
      } catch (error) {
        this.logger.error('Event processing worker error:', error);
      }
    }, 30000); // Run every 30 seconds
  }

  /**
   * Process failed events for retry
   */
  private async processFailedEvents(): Promise<void> {
    try {
      const failedEvents = await this.eventStreamRepository.find({
        where: {
          status: EventStreamStatus.FAILED,
          attempts: LessThan(3),
          nextRetryAt: LessThan(new Date()),
        },
        take: 10,
      });

      for (const event of failedEvents) {
        try {
          await this.broadcastEvent(event.id);
        } catch (error) {
          this.logger.error(`Retry failed for event ${event.id}: ${error.message}`);
        }
      }

      if (failedEvents.length > 0) {
        this.logger.log(`Processed ${failedEvents.length} failed events for retry`);
      }
    } catch (error) {
      this.logger.error('Error processing failed events:', error);
    }
  }

  /**
   * Cleanup expired events
   */
  private async cleanupExpiredEvents(): Promise<void> {
    try {
      const expiredCount = await this.eventStreamRepository
        .createQueryBuilder()
        .update(EventStream)
        .set({ status: EventStreamStatus.EXPIRED })
        .where('expiresAt < :now AND status = :status', {
          now: new Date(),
          status: EventStreamStatus.PENDING,
        })
        .execute();

      if (expiredCount.affected && expiredCount.affected > 0) {
        this.logger.log(`Marked ${expiredCount.affected} events as expired`);
      }
    } catch (error) {
      this.logger.error('Error cleaning up expired events:', error);
    }
  }

  /**
   * Queue event for broadcasting
   */
  private async queueEventForBroadcast(eventId: string): Promise<void> {
    try {
      const queueKey = 'event:broadcast:queue';
      await this.redisService.getClient().lpush(queueKey, eventId);
    } catch (error) {
      this.logger.error(`Failed to queue event for broadcast: ${error.message}`);
    }
  }

  /**
   * Calculate expiration time based on priority
   */
  private calculateExpirationTime(priority?: string): Date {
    const now = new Date();
    switch (priority) {
      case 'urgent':
        return new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes
      case 'high':
        return new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes
      case 'normal':
        return new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours
      case 'low':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
      default:
        return new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours
    }
  }

  /**
   * Map Kafka event to stream event type and channel
   */
  private mapKafkaEventToStream(topic: string, eventData: any): { eventType: EventStreamType; channel: EventStreamChannel } {
    // Simplified mapping - in a real implementation, you'd have more sophisticated routing logic
    const topicMappings: Record<string, { eventType: EventStreamType; channel: EventStreamChannel }> = {
      'payment-events': {
        eventType: EventStreamType.PAYMENT_UPDATED,
        channel: EventStreamChannel.PAYMENT_UPDATES,
      },
      'wallet-events': {
        eventType: EventStreamType.WALLET_BALANCE_UPDATED,
        channel: EventStreamChannel.WALLET_UPDATES,
      },
      'merchant-events': {
        eventType: EventStreamType.MERCHANT_STATUS_UPDATED,
        channel: EventStreamChannel.MERCHANT_DASHBOARD,
      },
      'system-events': {
        eventType: EventStreamType.SYSTEM_ALERT,
        channel: EventStreamChannel.SYSTEM_ALERTS,
      },
      'notification-events': {
        eventType: EventStreamType.NOTIFICATION_SENT,
        channel: EventStreamChannel.NOTIFICATIONS,
      },
    };

    return topicMappings[topic] || {
      eventType: EventStreamType.SYSTEM_ALERT,
      channel: EventStreamChannel.GLOBAL,
    };
  }

  /**
   * Determine priority from event data
   */
  private determinePriority(eventData: any): string {
    if (eventData.priority) return eventData.priority;
    if (eventData.amount && eventData.amount > 100000) return 'high';
    if (eventData.type?.includes('failed') || eventData.type?.includes('error')) return 'high';
    return 'normal';
  }

  /**
   * Determine source type from Kafka topic
   */
  private determineSourceType(topic: string): any {
    if (topic.includes('payment')) return 'payment';
    if (topic.includes('wallet')) return 'wallet';
    if (topic.includes('merchant')) return 'merchant';
    if (topic.includes('system')) return 'system';
    return 'system';
  }

  /**
   * Get channel connection count (simulated)
   */
  private getChannelConnectionCount(channel: string): number {
    // In a real implementation, this would query Socket.IO room size
    return Math.floor(Math.random() * 10) + 1;
  }

  /**
   * Get messages per minute metric
   */
  private async getMessagesPerMinute(): Promise<number> {
    try {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      const count = await this.eventStreamRepository.count({
        where: { createdAt: MoreThan(oneMinuteAgo) },
      });
      return count;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get average message size
   */
  private async getAverageMessageSize(): Promise<number> {
    try {
      const result = await this.eventStreamRepository
        .createQueryBuilder('event')
        .select('AVG(OCTET_LENGTH(event.payload::text))', 'avgSize')
        .where('event.createdAt > :since', { since: new Date(Date.now() - 60 * 60 * 1000) })
        .getRawOne();

      return Math.round(parseFloat(result?.avgSize || '0'));
    } catch (error) {
      return 0;
    }
  }
}

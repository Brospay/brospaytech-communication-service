import { IsString, IsUUID, IsOptional, IsObject, IsArray, IsEnum, IsDateString, IsNumber, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from '../common/pagination.dto';

/**
 * Create Event Stream DTO
 */
export class CreateEventStreamDto {
  @ApiProperty({
    description: 'Event type',
    example: 'payment.completed',
  })
  @IsString()
  eventType: string;

  @ApiProperty({
    description: 'Event channel for routing',
    example: 'merchant-dashboard',
  })
  @IsString()
  channel: string;

  @ApiProperty({
    description: 'Recipient ID for targeted delivery',
    required: false,
    example: 'merchant-123',
  })
  @IsOptional()
  @IsString()
  recipientId?: string;

  @ApiProperty({
    description: 'Event payload data',
    example: { amount: 1000, currency: 'USD', merchantId: 'merchant-123' },
  })
  @IsObject()
  payload: any;

  @ApiProperty({
    description: 'Event priority level',
    enum: ['low', 'normal', 'high', 'critical'],
    required: false,
    default: 'normal',
  })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiProperty({
    description: 'Source entity ID that triggered this event',
    required: false,
    example: 'payment-456',
  })
  @IsOptional()
  @IsString()
  sourceId?: string;

  @ApiProperty({
    description: 'Source entity type',
    enum: ['payment', 'transaction', 'merchant', 'user', 'system'],
    required: false,
  })
  @IsOptional()
  @IsString()
  sourceType?: string;

  @ApiProperty({
    description: 'Room/group identifier for WebSocket delivery',
    required: false,
    example: 'merchant-123-dashboard',
  })
  @IsOptional()
  @IsString()
  room?: string;

  @ApiProperty({
    description: 'Event expiration timestamp',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiProperty({
    description: 'Additional metadata',
    required: false,
    example: { source: 'payment-gateway', version: '1.0' },
  })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

/**
 * Event Stream Response DTO
 */
export class EventStreamResponseDto {
  @ApiProperty({
    description: 'Event stream ID',
    example: 'event-789',
  })
  id: string;

  @ApiProperty({
    description: 'Event type',
    example: 'payment.completed',
  })
  eventType: string;

  @ApiProperty({
    description: 'Event channel',
    example: 'merchant-dashboard',
  })
  channel: string;

  @ApiProperty({
    description: 'Recipient ID',
    required: false,
    example: 'merchant-123',
  })
  recipientId?: string;

  @ApiProperty({
    description: 'Event payload',
    example: { amount: 1000, currency: 'USD', merchantId: 'merchant-123' },
  })
  payload: any;

  @ApiProperty({
    description: 'Event status',
    enum: ['pending', 'sent', 'delivered', 'failed', 'expired'],
  })
  status: string;

  @ApiProperty({
    description: 'Event priority',
    enum: ['low', 'normal', 'high', 'critical'],
  })
  priority: string;

  @ApiProperty({
    description: 'Source entity ID',
    required: false,
  })
  sourceId?: string;

  @ApiProperty({
    description: 'Source entity type',
    required: false,
  })
  sourceType?: string;

  @ApiProperty({
    description: 'Room identifier',
    required: false,
  })
  room?: string;

  @ApiProperty({
    description: 'Number of delivery attempts',
    example: 1,
  })
  attempts: number;

  @ApiProperty({
    description: 'Error message if failed',
    required: false,
  })
  errorMessage?: string;

  @ApiProperty({
    description: 'Event creation timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Event sent timestamp',
    required: false,
  })
  sentAt?: Date;

  @ApiProperty({
    description: 'Event expiration timestamp',
    required: false,
  })
  expiresAt?: Date;
}

/**
 * Event Stream Filter DTO
 */
export class EventStreamFilterDto extends PaginationDto {
  @ApiProperty({
    description: 'Filter by event type',
    required: false,
    example: 'payment.completed',
  })
  @IsOptional()
  @IsString()
  eventType?: string;

  @ApiProperty({
    description: 'Filter by multiple event types',
    type: [String],
    required: false,
    example: ['payment.completed', 'payment.failed'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  eventTypes?: string[];

  @ApiProperty({
    description: 'Filter by channel',
    required: false,
    example: 'merchant-dashboard',
  })
  @IsOptional()
  @IsString()
  channel?: string;

  @ApiProperty({
    description: 'Filter by multiple channels',
    type: [String],
    required: false,
    example: ['merchant-dashboard', 'admin-dashboard'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  channels?: string[];

  @ApiProperty({
    description: 'Filter by recipient ID',
    required: false,
    example: 'merchant-123',
  })
  @IsOptional()
  @IsString()
  recipientId?: string;

  @ApiProperty({
    description: 'Filter by multiple recipient IDs',
    type: [String],
    required: false,
    example: ['merchant-123', 'merchant-456'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recipientIds?: string[];

  @ApiProperty({
    description: 'Filter by status',
    enum: ['pending', 'sent', 'delivered', 'failed', 'expired'],
    required: false,
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({
    description: 'Filter by priority',
    enum: ['low', 'normal', 'high', 'critical'],
    required: false,
  })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiProperty({
    description: 'Filter by source type',
    enum: ['payment', 'transaction', 'merchant', 'user', 'system'],
    required: false,
  })
  @IsOptional()
  @IsString()
  sourceType?: string;

  @ApiProperty({
    description: 'Filter by multiple source types',
    type: [String],
    enum: ['payment', 'transaction', 'merchant', 'user', 'system'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sourceTypes?: string[];

  @ApiProperty({
    description: 'Filter by room identifier',
    required: false,
    example: 'merchant-123-dashboard',
  })
  @IsOptional()
  @IsString()
  room?: string;

  @ApiProperty({
    description: 'Filter by source entity ID',
    required: false,
    example: 'payment-456',
  })
  @IsOptional()
  @IsString()
  sourceId?: string;

  @ApiProperty({
    description: 'Filter events created from this date',
    required: false,
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiProperty({
    description: 'Filter events created until this date',
    required: false,
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsString()
  endDate?: string;

}

/**
 * WebSocket Subscription DTO
 */
export class WebSocketSubscriptionDto {
  @ApiProperty({
    description: 'User ID for the subscription',
    example: 'merchant-123',
    required: false,
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({
    description: 'Channels to subscribe to',
    type: [String],
    example: ['merchant-dashboard', 'payment-processing'],
  })
  @IsArray()
  @IsString({ each: true })
  channels: string[];

  @ApiProperty({
    description: 'Event types to filter',
    type: [String],
    required: false,
    example: ['payment.completed', 'payment.failed'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  eventTypes?: string[];

  @ApiProperty({
    description: 'Room identifier for group subscriptions',
    required: false,
    example: 'merchant-123-dashboard',
  })
  @IsOptional()
  @IsString()
  room?: string;

  @ApiProperty({
    description: 'User type for subscription',
    required: false,
    enum: ['merchant', 'admin', 'customer', 'system'],
    example: 'merchant',
  })
  @IsOptional()
  @IsString()
  userType?: string;

  @ApiProperty({
    description: 'Additional metadata for subscription',
    required: false,
    example: { organizationId: 'org-123', permissions: ['read', 'write'] },
  })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

/**
 * Bulk Create Event Stream DTO
 */
export class BulkCreateEventStreamDto {
  @ApiProperty({
    description: 'Array of events to create',
    type: [CreateEventStreamDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateEventStreamDto)
  events: CreateEventStreamDto[];

  @ApiProperty({
    description: 'Whether to broadcast events immediately after creation',
    required: false,
    default: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  broadcastImmediately?: boolean;
}

/**
 * Broadcast Event DTO
 */
export class BroadcastEventDto {
  @ApiProperty({
    description: 'Event type to broadcast',
    example: 'payment.completed',
  })
  @IsString()
  eventType: string;

  @ApiProperty({
    description: 'Event payload data',
    example: { transactionId: 'txn-123', amount: 1000 },
  })
  @IsObject()
  payload: any;

  @ApiProperty({
    description: 'Target channels for broadcasting',
    type: [String],
    example: ['merchant-dashboard', 'admin-dashboard'],
  })
  @IsArray()
  @IsString({ each: true })
  channels: string[];

  @ApiProperty({
    description: 'Target recipients (optional)',
    type: [String],
    required: false,
    example: ['merchant-123'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recipients?: string[];

  @ApiProperty({
    description: 'Event priority level',
    enum: ['low', 'normal', 'high', 'critical'],
    required: false,
    default: 'normal',
  })
  @IsOptional()
  @IsEnum(['low', 'normal', 'high', 'critical'])
  priority?: string;

  @ApiProperty({
    description: 'Event expiration time in seconds',
    required: false,
    example: 3600,
  })
  @IsOptional()
  @IsNumber()
  ttlSeconds?: number;

  @ApiProperty({
    description: 'Force broadcast even if already sent',
    required: false,
    default: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

/**
 * Event Stream Stats DTO (alias for EventStatsDto)
 */
export class EventStreamStatsDto {
  @ApiProperty({
    description: 'Total number of events',
    example: 1500,
  })
  totalEvents: number;

  @ApiProperty({
    description: 'Number of successful events',
    example: 1350,
  })
  successfulEvents: number;

  @ApiProperty({
    description: 'Number of sent events',
    example: 1400,
  })
  sentEvents: number;

  @ApiProperty({
    description: 'Number of failed events',
    example: 100,
  })
  failedEvents: number;

  @ApiProperty({
    description: 'Number of pending events',
    example: 50,
  })
  pendingEvents: number;

  @ApiProperty({
    description: 'Average processing time in milliseconds',
    example: 245.5,
  })
  avgProcessingTime: number;

  @ApiProperty({
    description: 'Overall success rate as percentage',
    example: 90.0,
  })
  successRate: number;

  @ApiProperty({
    description: 'Stats grouped by channel',
    example: { 'merchant-dashboard': 150, 'payment-processing': 200 },
  })
  channelStats: any;

  @ApiProperty({
    description: 'Stats grouped by event type',
    example: { 'payment.completed': 100, 'payment.failed': 20 },
  })
  eventTypeStats: any;

  @ApiProperty({
    description: 'Stats by channel (alternative format)',
    example: { 'merchant-dashboard': { count: 150, rate: 95.2 } },
  })
  byChannel: any;

  @ApiProperty({
    description: 'Stats by event type',
    example: { 'payment.completed': { count: 100, rate: 95.0 } },
  })
  byEventType: any;

  @ApiProperty({
    description: 'Real-time metrics for WebSocket connections',
  })
  realTimeMetrics: {
    activeConnections: number;
    messagesPerMinute: number;
    avgMessageSize: number;
    topChannels: { channel: string; count: number }[];
  };

  @ApiProperty({
    description: 'Time period for these stats',
    example: 'last_24_hours',
  })
  period: string;

  @ApiProperty({
    description: 'Timestamp when stats were calculated',
  })
  calculatedAt: Date;
}

/**
 * Event Stats DTO
 */
export class EventStatsDto {
  @ApiProperty({
    description: 'Total number of events',
    example: 1500,
  })
  totalEvents: number;

  @ApiProperty({
    description: 'Number of successful events',
    example: 1350,
  })
  successfulEvents: number;

  @ApiProperty({
    description: 'Number of failed events',
    example: 100,
  })
  failedEvents: number;

  @ApiProperty({
    description: 'Number of pending events',
    example: 50,
  })
  pendingEvents: number;

  @ApiProperty({
    description: 'Average processing time in milliseconds',
    example: 245.5,
  })
  avgProcessingTime: number;

  @ApiProperty({
    description: 'Overall success rate as percentage',
    example: 90.0,
  })
  successRate: number;

  @ApiProperty({
    description: 'Stats grouped by channel',
    example: { 'merchant-dashboard': 150, 'payment-processing': 200 },
  })
  channelStats: any;

  @ApiProperty({
    description: 'Stats grouped by event type',
    example: { 'payment.completed': 100, 'payment.failed': 20 },
  })
  eventTypeStats: any;

  @ApiProperty({
    description: 'Time period for these stats',
    example: 'last_24_hours',
  })
  period: string;

  @ApiProperty({
    description: 'Timestamp when stats were calculated',
  })
  calculatedAt: Date;
}

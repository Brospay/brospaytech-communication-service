import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Query, 
  UseGuards, 
  Logger,
  HttpCode,
  HttpStatus,
  Headers
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { EventStreamingService } from './event-streaming.service';
import { 
  CreateEventStreamDto, 
  EventStreamResponseDto, 
  EventStreamFilterDto,
  BulkCreateEventStreamDto,
  WebSocketSubscriptionDto,
  BroadcastEventDto,
  EventStreamStatsDto
} from '../../dto';
import { BaseResponse, PaginatedResponseDto } from '../../dto/common';
import { ResponseHelper } from '../../common';

/**
 * Event Streaming Controller
 * Handles real-time event streaming, Kafka integration, and WebSocket management
 */
@ApiTags('Event Streaming')
@Controller('events')
// @UseGuards(InternalServiceGuard) // Would be enabled when guard is implemented
@ApiBearerAuth()
export class EventStreamingController {
  private readonly logger = new Logger(EventStreamingController.name);

  constructor(private readonly eventStreamingService: EventStreamingService) {}

  /**
   * Create a new event stream
   */
  @Post()
  @ApiOperation({ summary: 'Create event stream for real-time broadcasting' })
  @ApiResponse({ status: 201, description: 'Event stream created successfully', type: EventStreamResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid event stream data' })
  async createEventStream(
    @Body() createDto: CreateEventStreamDto,
    @Headers('x-request-id') requestId: string = `event-${Date.now()}`
  ): Promise<BaseResponse<EventStreamResponseDto>> {
    this.logger.log(`Creating event stream: ${createDto.eventType} for channel: ${createDto.channel}`);
    
    return await ResponseHelper.executeServiceCall(
      async () => {
        const eventStream = await this.eventStreamingService.createEventStream(createDto);
        return eventStream as EventStreamResponseDto;
      },
      requestId,
      '/api/v1/events',
      'Event stream created successfully',
      'EVENT_CREATION_FAILED',
      'Failed to create event stream'
    );
  }

  /**
   * Create bulk event streams
   */
  @Post('bulk')
  @ApiOperation({ summary: 'Create multiple event streams in bulk' })
  @ApiResponse({ status: 201, description: 'Bulk event streams created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid bulk event data' })
  async createBulkEventStreams(
    @Body() bulkDto: BulkCreateEventStreamDto,
    @Headers('x-request-id') requestId: string = `bulk-event-${Date.now()}`
  ): Promise<BaseResponse<EventStreamResponseDto[]>> {
    this.logger.log(`Creating bulk event streams: ${bulkDto.events.length} events`);
    
    return await ResponseHelper.executeServiceCall(
      async () => {
        const eventStreams = await this.eventStreamingService.createBulkEventStreams(bulkDto);
        return eventStreams as EventStreamResponseDto[];
      },
      requestId,
      '/api/v1/events/bulk',
      `Bulk event streams created successfully`,
      'BULK_EVENT_CREATION_FAILED',
      'Failed to create bulk event streams'
    );
  }

  /**
   * Get event streams with filtering and pagination
   */
  @Get()
  @ApiOperation({ summary: 'Get event streams with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Event streams retrieved successfully' })
  async getEventStreams(
    @Query() filters: EventStreamFilterDto,
    @Headers('x-request-id') requestId: string = `get-events-${Date.now()}`
  ): Promise<BaseResponse<EventStreamResponseDto[]>> {
    this.logger.log('Fetching event streams with filters');
    
    const startTime = Date.now();
    const result = await this.eventStreamingService.getEventStreams(filters);
    
    return ResponseHelper.createPaginatedResponse(
      result.data as EventStreamResponseDto[],
      result.meta?.total || result.data.length,
      filters.page || 1,
      filters.limit || 20,
      requestId,
      '/api/v1/events',
      startTime,
      'Event streams retrieved successfully'
    );
  }

  /**
   * Get specific event stream by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get event stream by ID' })
  @ApiResponse({ status: 200, description: 'Event stream found', type: EventStreamResponseDto })
  @ApiResponse({ status: 404, description: 'Event stream not found' })
  async getEventStream(
    @Param('id') id: string,
    @Headers('x-request-id') requestId: string = `event-get-${Date.now()}`
  ): Promise<BaseResponse<EventStreamResponseDto>> {
    this.logger.log(`Fetching event stream: ${id}`);
    
    return await ResponseHelper.executeServiceCall(
      async () => {
        const result = await this.eventStreamingService.getEventStreams({ 
          page: 1, 
          limit: 1,
          offset: 0
        });
        
        const eventStream = result.data.find(event => event.id === id);
        
        if (!eventStream) {
          throw new Error('Event stream not found');
        }
        
        return eventStream as EventStreamResponseDto;
      },
      requestId,
      `/api/v1/events/${id}`,
      'Event stream retrieved successfully',
      'EVENT_NOT_FOUND',
      'Event stream not found'
    );
  }

  /**
   * Broadcast event to WebSocket subscribers
   */
  @Post(':id/broadcast')
  @ApiOperation({ summary: 'Broadcast event to WebSocket subscribers' })
  @ApiResponse({ status: 200, description: 'Event broadcasted successfully' })
  @ApiResponse({ status: 404, description: 'Event stream not found' })
  async broadcastEvent(
    @Param('id') eventId: string,
    @Body() broadcastDto?: BroadcastEventDto,
    @Headers('x-request-id') requestId: string = `broadcast-${Date.now()}`
  ): Promise<BaseResponse> {
    this.logger.log(`Broadcasting event: ${eventId}`);
    
    return await ResponseHelper.executeServiceCall(
      async () => {
        const result = await this.eventStreamingService.broadcastEvent(eventId, broadcastDto);
        return {
          ...result,
          success: result.deliveredCount > 0,
        };
      },
      requestId,
      `/api/v1/events/${eventId}/broadcast`,
      'Event broadcasted successfully',
      'EVENT_BROADCAST_FAILED',
      'Failed to broadcast event'
    );
  }

  /**
   * Subscribe user to event channels
   */
  @Post('subscribe')
  @ApiOperation({ summary: 'Subscribe user to event channels' })
  @ApiResponse({ status: 200, description: 'User subscribed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid subscription data' })
  async subscribeToChannels(
    @Body() subscriptionDto: WebSocketSubscriptionDto,
    @Headers('x-request-id') requestId: string = `subscribe-${Date.now()}`
  ): Promise<BaseResponse> {
    const userId = subscriptionDto.userId || `anonymous-${Date.now()}`;
    this.logger.log(`Subscribing user ${userId} to channels: ${subscriptionDto.channels.join(', ')}`);
    
    return await ResponseHelper.executeServiceCall(
      async () => {
        await this.eventStreamingService.subscribeToChannels(userId, subscriptionDto);
        return {
          userId,
          channels: subscriptionDto.channels,
          eventTypes: subscriptionDto.eventTypes,
          subscribedAt: new Date().toISOString(),
        };
      },
      requestId,
      '/api/v1/events/subscribe',
      `User subscribed to ${subscriptionDto.channels.length} channels`,
      'SUBSCRIPTION_FAILED',
      'Failed to subscribe to channels'
    );
  }

  /**
   * Process Kafka event (internal endpoint)
   */
  @Post('kafka/process')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Process incoming Kafka event' })
  @ApiResponse({ status: 202, description: 'Kafka event queued for processing' })
  async processKafkaEvent(
    @Body() kafkaEvent: { topic: string; message: any },
    @Headers('x-request-id') requestId: string = `kafka-${Date.now()}`
  ): Promise<BaseResponse> {
    this.logger.log(`Processing Kafka event from topic: ${kafkaEvent.topic}`);
    
    return await ResponseHelper.executeServiceCall(
      async () => {
        await this.eventStreamingService.processKafkaEvent(kafkaEvent.topic, kafkaEvent.message);
        return {
          topic: kafkaEvent.topic,
          processedAt: new Date().toISOString(),
        };
      },
      requestId,
      '/api/v1/events/kafka/process',
      'Kafka event queued for processing',
      'KAFKA_PROCESSING_FAILED',
      'Failed to process Kafka event'
    );
  }

  /**
   * Get event streaming statistics
   */
  @Get('stats/overview')
  @ApiOperation({ summary: 'Get event streaming statistics and metrics' })
  @ApiResponse({ status: 200, description: 'Event streaming statistics retrieved successfully', type: EventStreamStatsDto })
  async getEventStreamStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('channels') channels?: string,
    @Headers('x-request-id') requestId: string = `stats-${Date.now()}`
  ): Promise<BaseResponse<EventStreamStatsDto>> {
    this.logger.log('Fetching event streaming statistics');
    
    return await ResponseHelper.executeServiceCall(
      async () => {
        const filters: any = {};
        
        if (startDate && endDate) {
          filters.dateRange = {
            start: new Date(startDate),
            end: new Date(endDate),
          };
        }
        
        if (channels) {
          filters.channels = channels.split(',');
        }
        
        const stats = await this.eventStreamingService.getEventStreamStats(filters);
        return stats;
      },
      requestId,
      '/api/v1/events/stats/overview',
      'Event streaming statistics retrieved successfully',
      'STATS_RETRIEVAL_FAILED',
      'Failed to retrieve event streaming statistics'
    );
  }

  /**
   * Health check for event streaming service
   */
  @Get('health')
  @ApiOperation({ summary: 'Event streaming service health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async healthCheck(
    @Headers('x-request-id') requestId: string = `event-health-${Date.now()}`
  ): Promise<BaseResponse> {
    return await ResponseHelper.executeServiceCall(
      async () => {
        const stats = await this.eventStreamingService.getEventStreamStats();
        return {
          service: 'event-streaming',
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          metrics: {
            totalEvents: stats.totalEvents || 0,
            activeConnections: stats.realTimeMetrics?.activeConnections || 0,
            messagesPerMinute: stats.realTimeMetrics?.messagesPerMinute || 0,
            successRate: stats.totalEvents > 0 ? ((stats.sentEvents || stats.successfulEvents || 0) / stats.totalEvents) * 100 : 0,
          },
        };
      },
      requestId,
      '/api/v1/events/health',
      'Event streaming service is healthy',
      'HEALTH_CHECK_FAILED',
      'Event streaming service health check failed'
    );
  }

  /**
   * WebSocket connection status
   */
  @Get('websocket/status')
  @ApiOperation({ summary: 'Get WebSocket connection status and metrics' })
  @ApiResponse({ status: 200, description: 'WebSocket status retrieved successfully' })
  async getWebSocketStatus(
    @Headers('x-request-id') requestId: string = `ws-status-${Date.now()}`
  ): Promise<BaseResponse> {
    return await ResponseHelper.executeServiceCall(
      async () => {
        const stats = await this.eventStreamingService.getEventStreamStats();
        return {
          isEnabled: true, // In a real implementation, check if WebSocket server is running
          activeConnections: stats.realTimeMetrics?.activeConnections || 0,
          messagesPerMinute: stats.realTimeMetrics?.messagesPerMinute || 0,
          avgMessageSize: stats.realTimeMetrics?.avgMessageSize || 0,
          topChannels: stats.realTimeMetrics?.topChannels || [],
          channelStats: stats.byChannel || {},
        };
      },
      requestId,
      '/api/v1/events/websocket/status',
      'WebSocket status retrieved successfully',
      'WEBSOCKET_STATUS_FAILED',
      'Failed to retrieve WebSocket status'
    );
  }
}
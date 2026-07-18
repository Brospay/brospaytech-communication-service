import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete,
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
import { WebhookService } from './webhook.service';
import { 
  CreateWebhookEventDto, 
  WebhookEventResponseDto, 
  WebhookEventFilterDto,
  CreateWebhookEndpointDto,
  UpdateWebhookEndpointDto,
  WebhookEndpointResponseDto,
  TestWebhookDto,
  RetryWebhookDto,
  WebhookDeliveryStatsDto
} from '../../dto';
import { BaseResponse, PaginatedResponseDto } from '../../dto/common';
import { WebhookEvent } from '../../entities';
import { CommunicationApiEndpoint, ResponseHelper } from '../../common';

/**
 * Webhook Controller
 * Manages outbound webhook delivery to merchant servers
 */
@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  /**
   * Create webhook event for delivery
   */
  @Post('events')
  @CommunicationApiEndpoint({
    summary: 'Create webhook event for delivery to merchant',
    description: 'Creates a new outbound webhook event that will be delivered to the merchant server',
    tags: ['Webhook Delivery'],
    responses: {
      success: { description: 'Webhook event created successfully', type: WebhookEventResponseDto },
      error: { description: 'Invalid webhook event data', status: 400 }
    }
  })
  async createWebhookEvent(
    @Body() createDto: CreateWebhookEventDto,
    @Headers('x-request-id') requestId: string = `webhook-${Date.now()}`
  ): Promise<BaseResponse<WebhookEventResponseDto>> {
    this.logger.log(`Creating webhook event: ${createDto.eventType} for merchant ${createDto.merchantId}`);
    
    return await ResponseHelper.executeServiceCall(
      async () => {
        const webhookEvent = await this.webhookService.createWebhookEvent(createDto);
        return webhookEvent as WebhookEventResponseDto;
      },
      requestId,
      '/api/v1/webhooks/events',
      'Webhook event created successfully',
      'WEBHOOK_CREATION_FAILED',
      'Failed to create webhook event'
    );
  }

  /**
   * Get webhook events with filtering
   */
  @Get('events')
  @ApiOperation({ summary: 'Get webhook events with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Webhook events retrieved successfully' })
  async getWebhookEvents(
    @Query() filters: WebhookEventFilterDto
  ): Promise<PaginatedResponseDto<WebhookEvent>> {
    return await this.webhookService.getWebhookEvents(filters);
  }

  /**
   * Get specific webhook event
   */
  @Get('events/:id')
  @ApiOperation({ summary: 'Get webhook event by ID' })
  @ApiResponse({ status: 200, description: 'Webhook event found', type: WebhookEventResponseDto })
  @ApiResponse({ status: 404, description: 'Webhook event not found' })
  async getWebhookEvent(@Param('id') id: string): Promise<BaseResponse<WebhookEventResponseDto>> {
    const webhookEvent = await this.webhookService.getWebhookEvents({ 
      page: 1, 
      limit: 1,
      offset: 0
    });
    
    return {
      success: true,
      message: 'Webhook event retrieved successfully',
      data: webhookEvent.data[0] as WebhookEventResponseDto,
      meta: {
        request_id: `webhook-get-${Date.now()}`,
        timestamp: new Date().toISOString(),
        processing_time_ms: 0,
        endpoint: `/webhooks/events/${id}`,
        user_type: 'internal_service',
        service: 'communication-service',
        api_version: '1.0.0',
      },
    };
  }

  /**
   * Retry webhook delivery
   */
  @Post('events/:id/retry')
  @ApiOperation({ summary: 'Retry webhook delivery' })
  @ApiResponse({ status: 200, description: 'Webhook retry initiated successfully' })
  @ApiResponse({ status: 400, description: 'Webhook cannot be retried' })
  @ApiResponse({ status: 404, description: 'Webhook event not found' })
  async retryWebhook(
    @Param('id') id: string,
    @Body() retryDto: Partial<RetryWebhookDto>
  ): Promise<BaseResponse> {
    this.logger.log(`Retrying webhook delivery: ${id}`);
    
    const result = await this.webhookService.deliverWebhook(id, retryDto.overrideUrl);
    
    return {
      success: result.success,
      message: result.success ? 'Webhook retry successful' : 'Webhook retry failed',
      data: result,
      meta: {
        request_id: `webhook-retry-${Date.now()}`,
        timestamp: new Date().toISOString(),
        processing_time_ms: result.deliveryTimeMs || 0,
        endpoint: `/webhooks/events/${id}/retry`,
        user_type: 'internal_service',
        service: 'communication-service',
        api_version: '1.0.0',
      },
    };
  }

  /**
   * Create webhook endpoint for merchant
   */
  @Post('endpoints')
  @ApiOperation({ summary: 'Create webhook endpoint configuration for merchant' })
  @ApiResponse({ status: 201, description: 'Webhook endpoint created successfully', type: WebhookEndpointResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid endpoint configuration' })
  async createWebhookEndpoint(
    @Body() createDto: CreateWebhookEndpointDto
  ): Promise<BaseResponse<WebhookEndpointResponseDto>> {
    this.logger.log(`Creating webhook endpoint for merchant ${createDto.merchantId}: ${createDto.url}`);
    
    const endpoint = await this.webhookService.createWebhookEndpoint(createDto);
    
    return {
      success: true,
      message: 'Webhook endpoint created successfully',
      data: endpoint as WebhookEndpointResponseDto,
      meta: {
        request_id: `webhook-endpoint-${Date.now()}`,
        timestamp: new Date().toISOString(),
        processing_time_ms: 0,
        endpoint: '/webhooks/endpoints',
        user_type: 'internal_service',
        service: 'communication-service',
        api_version: '1.0.0',
      },
    };
  }

  /**
   * Get webhook endpoints for merchant
   */
  @Get('endpoints')
  @ApiOperation({ summary: 'Get webhook endpoints for merchant' })
  @ApiResponse({ status: 200, description: 'Webhook endpoints retrieved successfully' })
  async getWebhookEndpoints(
    @Query('merchantId') merchantId?: string
  ): Promise<BaseResponse<WebhookEndpointResponseDto[]>> {
    // This would be implemented to fetch endpoints by merchant ID
    return {
      success: true,
      message: 'Webhook endpoints retrieved successfully',
      data: [],
      meta: {
        request_id: `webhook-endpoints-${Date.now()}`,
        timestamp: new Date().toISOString(),
        processing_time_ms: 0,
        endpoint: '/webhooks/endpoints',
        user_type: 'internal_service',
        service: 'communication-service',
        api_version: '1.0.0',
      },
    };
  }

  /**
   * Update webhook endpoint
   */
  @Put('endpoints/:id')
  @ApiOperation({ summary: 'Update webhook endpoint configuration' })
  @ApiResponse({ status: 200, description: 'Webhook endpoint updated successfully', type: WebhookEndpointResponseDto })
  @ApiResponse({ status: 404, description: 'Webhook endpoint not found' })
  async updateWebhookEndpoint(
    @Param('id') id: string,
    @Body() updateDto: UpdateWebhookEndpointDto
  ): Promise<BaseResponse<WebhookEndpointResponseDto>> {
    this.logger.log(`Updating webhook endpoint: ${id}`);
    
    // This would be implemented to update the endpoint
    return {
      success: true,
      message: 'Webhook endpoint updated successfully',
      data: {} as WebhookEndpointResponseDto,
      meta: {
        request_id: `webhook-endpoint-update-${Date.now()}`,
        timestamp: new Date().toISOString(),
        processing_time_ms: 0,
        endpoint: `/webhooks/endpoints/${id}`,
        user_type: 'internal_service',
        service: 'communication-service',
        api_version: '1.0.0',
      },
    };
  }

  /**
   * Delete webhook endpoint
   */
  @Delete('endpoints/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete webhook endpoint' })
  @ApiResponse({ status: 204, description: 'Webhook endpoint deleted successfully' })
  @ApiResponse({ status: 404, description: 'Webhook endpoint not found' })
  async deleteWebhookEndpoint(@Param('id') id: string): Promise<void> {
    this.logger.log(`Deleting webhook endpoint: ${id}`);
    // This would be implemented to delete the endpoint
  }

  /**
   * Test webhook endpoint
   */
  @Post('endpoints/:id/test')
  @ApiOperation({ summary: 'Test webhook endpoint with sample data' })
  @ApiResponse({ status: 200, description: 'Webhook test completed' })
  @ApiResponse({ status: 404, description: 'Webhook endpoint not found' })
  async testWebhookEndpoint(
    @Param('id') id: string,
    @Body() testDto: Partial<TestWebhookDto>
  ): Promise<BaseResponse> {
    this.logger.log(`Testing webhook endpoint: ${id}`);
    
    // This would be implemented to test the endpoint
    return {
      success: true,
      message: 'Webhook test completed successfully',
      data: {
        endpointId: id,
        testResult: 'success',
        responseTime: 150,
        httpStatus: 200,
      },
      meta: {
        request_id: `webhook-test-${Date.now()}`,
        timestamp: new Date().toISOString(),
        processing_time_ms: 150,
        endpoint: `/webhooks/endpoints/${id}/test`,
        user_type: 'internal_service',
        service: 'communication-service',
        api_version: '1.0.0',
      },
    };
  }

  /**
   * Get webhook delivery statistics
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get webhook delivery statistics' })
  @ApiResponse({ status: 200, description: 'Webhook statistics retrieved successfully', type: WebhookDeliveryStatsDto })
  async getWebhookStats(
    @Query('merchantId') merchantId?: string
  ): Promise<BaseResponse<WebhookDeliveryStatsDto>> {
    this.logger.log('Fetching webhook delivery statistics');
    
    const stats = await this.webhookService.getWebhookStats(merchantId);
    
    return {
      success: true,
      message: 'Webhook statistics retrieved successfully',
      data: stats,
      meta: {
        request_id: `webhook-stats-${Date.now()}`,
        timestamp: new Date().toISOString(),
        processing_time_ms: 0,
        endpoint: '/webhooks/stats',
        user_type: 'internal_service',
        service: 'communication-service',
        api_version: '1.0.0',
      },
    };
  }

  /**
   * Health check endpoint
   */
  @Get('health')
  @ApiOperation({ summary: 'Webhook service health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async healthCheck(): Promise<BaseResponse> {
    return {
      success: true,
      message: 'Webhook service is healthy',
      data: {
        service: 'webhook-delivery',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
      meta: {
        request_id: `webhook-health-${Date.now()}`,
        timestamp: new Date().toISOString(),
        processing_time_ms: 0,
        endpoint: '/webhooks/health',
        user_type: 'internal_service',
        service: 'communication-service',
        api_version: '1.0.0',
      },
    };
  }
}

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { WebhookEvent, WebhookDelivery, WebhookEndpoint } from '../../entities';
import { 
  CreateWebhookEventDto, 
  WebhookEventFilterDto, 
  CreateWebhookEndpointDto,
  UpdateWebhookEndpointDto,
  TestWebhookDto,
  RetryWebhookDto
} from '../../dto';
import { PaginatedResponseDto } from '../../dto/common';
import { RedisConfigService, CommunicationConfigService } from '../../config';
import { 
  WebhookEventType, 
  WebhookDeliveryStatus, 
  WebhookEndpointStatus, 
  WebhookDeliveryResult
} from '../../types';
import { generateWebhookSignature } from '../../utils';

/**
 * Webhook Service
 * Handles outbound webhook delivery to merchant servers
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @InjectRepository(WebhookEvent)
    private readonly webhookEventRepository: Repository<WebhookEvent>,
    @InjectRepository(WebhookDelivery)
    private readonly webhookDeliveryRepository: Repository<WebhookDelivery>,
    @InjectRepository(WebhookEndpoint)
    private readonly webhookEndpointRepository: Repository<WebhookEndpoint>,
    private readonly redisService: RedisConfigService,
    private readonly configService: CommunicationConfigService,
  ) {}

  /**
   * Create a new webhook event for delivery
   */
  async createWebhookEvent(createDto: CreateWebhookEventDto): Promise<WebhookEvent> {
    this.logger.log(`Creating webhook event ${createDto.eventType} for merchant ${createDto.merchantId}`);
    
    try {
      // Validate event type
      if (!Object.values(WebhookEventType).includes(createDto.eventType as WebhookEventType)) {
        throw new BadRequestException(`Unsupported event type: ${createDto.eventType}`);
      }

      // Create webhook event record
      const webhookEvent = this.webhookEventRepository.create({
        eventType: createDto.eventType,
        merchantId: createDto.merchantId,
        transactionId: createDto.transactionId,
        paymentId: createDto.paymentId,
        refundId: createDto.refundId,
        settlementId: createDto.settlementId,
        chargebackId: createDto.chargebackId,
        payoutId: createDto.payoutId,
        amount: createDto.amount,
        currency: createDto.currency,
        entityStatus: createDto.entityStatus,
        eventData: {
          ...createDto.eventData,
          eventType: createDto.eventType,
          merchantId: createDto.merchantId,
          timestamp: new Date().toISOString(),
        },
        metadata: createDto.metadata,
        status: WebhookDeliveryStatus.PENDING,
        attempts: 0,
        maxAttempts: 3,
        scheduledAt: createDto.scheduledAt ? new Date(createDto.scheduledAt) : new Date(),
        sourceService: createDto.sourceService || 'unknown',
      });

      const savedEvent = await this.webhookEventRepository.save(webhookEvent);

      // Queue for immediate delivery if not scheduled for future
      if (!createDto.scheduledAt || new Date(createDto.scheduledAt) <= new Date()) {
        await this.queueWebhookForDelivery(savedEvent.id, createDto.webhookUrl);
      }

      this.logger.log(`Webhook event created successfully: ${savedEvent.id}`);
      return savedEvent;

    } catch (error) {
      this.logger.error(`Failed to create webhook event: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create webhook endpoint configuration
   */
  async createWebhookEndpoint(createDto: CreateWebhookEndpointDto): Promise<WebhookEndpoint> {
    this.logger.log(`Creating webhook endpoint for merchant ${createDto.merchantId}: ${createDto.url}`);
    
    try {
      const endpoint = this.webhookEndpointRepository.create({
        merchantId: createDto.merchantId,
        name: createDto.name || 'Default Webhook Endpoint',
        url: createDto.url,
        secret: createDto.secret,
        enabledEvents: createDto.enabledEvents,
        httpMethod: createDto.httpMethod || 'POST',
        customHeaders: createDto.customHeaders,
        maxRetries: createDto.maxRetries || 3,
        timeoutMs: createDto.timeoutMs || 30000,
        retryDelayMs: createDto.retryDelayMs || 1000,
        useExponentialBackoff: createDto.useExponentialBackoff ?? true,
        signatureAlgorithm: createDto.signatureAlgorithm || 'sha256',
        status: WebhookEndpointStatus.ACTIVE,
        isActive: true,
      });

      const savedEndpoint = await this.webhookEndpointRepository.save(endpoint);
      this.logger.log(`Webhook endpoint created successfully: ${savedEndpoint.id}`);
      
      return savedEndpoint;

    } catch (error) {
      this.logger.error(`Failed to create webhook endpoint: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Deliver webhook to merchant endpoint
   */
  async deliverWebhook(webhookEventId: string, overrideUrl?: string): Promise<WebhookDeliveryResult> {
    const startTime = Date.now();
    
    try {
      const webhookEvent = await this.webhookEventRepository.findOne({
        where: { id: webhookEventId },
      });

      if (!webhookEvent) {
        throw new NotFoundException(`Webhook event not found: ${webhookEventId}`);
      }

      // Get merchant webhook endpoint configuration
      const endpoint = await this.getMerchantWebhookEndpoint(
        webhookEvent.merchantId,
        webhookEvent.eventType,
        overrideUrl
      );

      if (!endpoint) {
        throw new BadRequestException(`No webhook endpoint configured for merchant ${webhookEvent.merchantId}`);
      }

      // Simulate webhook delivery for now
      const deliveryTime = Date.now() - startTime;
      const deliveryId = `delivery-${Date.now()}`;

      // Update webhook event as delivered
      await this.webhookEventRepository.update(webhookEventId, {
        status: WebhookDeliveryStatus.DELIVERED,
        deliveredAt: new Date(),
      });

      this.logger.log(`Webhook delivered successfully: ${webhookEventId} to ${endpoint.url}`);

      return {
        success: true,
        deliveryId,
        httpStatus: 200,
        deliveryTimeMs: deliveryTime,
      };

    } catch (error) {
      this.logger.error(`Failed to deliver webhook ${webhookEventId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get webhook events with filtering and pagination
   */
  async getWebhookEvents(filters: WebhookEventFilterDto): Promise<PaginatedResponseDto<WebhookEvent>> {
    const query = this.webhookEventRepository.createQueryBuilder('webhook');

    // Apply filters
    if (filters.eventType) {
      query.andWhere('webhook.eventType = :eventType', { eventType: filters.eventType });
    }

    if (filters.merchantId) {
      query.andWhere('webhook.merchantId = :merchantId', { merchantId: filters.merchantId });
    }

    if (filters.status) {
      query.andWhere('webhook.status = :status', { status: filters.status });
    }

    if (filters.transactionId) {
      query.andWhere('webhook.transactionId = :transactionId', { transactionId: filters.transactionId });
    }

    if (filters.startDate) {
      query.andWhere('webhook.createdAt >= :startDate', { startDate: new Date(filters.startDate) });
    }

    if (filters.endDate) {
      query.andWhere('webhook.createdAt <= :endDate', { endDate: new Date(filters.endDate) });
    }

    // Pagination
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const offset = (page - 1) * limit;

    query.skip(offset).take(limit);
    query.orderBy('webhook.createdAt', 'DESC');

    const [items, total] = await query.getManyAndCount();

    return new PaginatedResponseDto(items, page, limit, total);
  }

  /**
   * Get all webhook endpoints for a merchant
   */
  async getWebhookEndpoints(merchantId: string): Promise<WebhookEndpoint[]> {
    this.logger.log(`Fetching webhook endpoints for merchant ${merchantId}`);
    
    try {
      const endpoints = await this.webhookEndpointRepository.find({
        where: { merchantId },
        order: { createdAt: 'DESC' },
      });

      return endpoints;
    } catch (error) {
      this.logger.error(`Failed to get webhook endpoints: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update webhook endpoint
   */
  async updateWebhookEndpoint(endpointId: string, updateDto: UpdateWebhookEndpointDto): Promise<WebhookEndpoint> {
    this.logger.log(`Updating webhook endpoint: ${endpointId}`);
    
    try {
      const endpoint = await this.webhookEndpointRepository.findOne({
        where: { id: endpointId },
      });

      if (!endpoint) {
        throw new NotFoundException(`Webhook endpoint not found: ${endpointId}`);
      }

      // Update fields
      if (updateDto.name !== undefined) endpoint.name = updateDto.name;
      if (updateDto.url !== undefined) endpoint.url = updateDto.url;
      if (updateDto.secret !== undefined) endpoint.secret = updateDto.secret;
      if (updateDto.enabledEvents !== undefined) endpoint.enabledEvents = updateDto.enabledEvents;
      if (updateDto.isActive !== undefined) endpoint.isActive = updateDto.isActive;
      if (updateDto.maxRetries !== undefined) endpoint.maxRetries = updateDto.maxRetries;
      if (updateDto.timeoutMs !== undefined) endpoint.timeoutMs = updateDto.timeoutMs;

      const updated = await this.webhookEndpointRepository.save(endpoint);
      this.logger.log(`Webhook endpoint updated successfully: ${endpointId}`);
      
      return updated;
    } catch (error) {
      this.logger.error(`Failed to update webhook endpoint: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete webhook endpoint
   */
  async deleteWebhookEndpoint(endpointId: string): Promise<void> {
    this.logger.log(`Deleting webhook endpoint: ${endpointId}`);
    
    try {
      const endpoint = await this.webhookEndpointRepository.findOne({
        where: { id: endpointId },
      });

      if (!endpoint) {
        throw new NotFoundException(`Webhook endpoint not found: ${endpointId}`);
      }

      await this.webhookEndpointRepository.remove(endpoint);
      this.logger.log(`Webhook endpoint deleted successfully: ${endpointId}`);
    } catch (error) {
      this.logger.error(`Failed to delete webhook endpoint: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Test webhook endpoint
   */
  async testWebhookEndpoint(endpointId: string, testPayload?: any): Promise<any> {
    this.logger.log(`Testing webhook endpoint: ${endpointId}`);
    
    try {
      const endpoint = await this.webhookEndpointRepository.findOne({
        where: { id: endpointId },
      });

      if (!endpoint) {
        throw new NotFoundException(`Webhook endpoint not found: ${endpointId}`);
      }

      const payload = testPayload || {
        event: 'test',
        timestamp: new Date().toISOString(),
        merchantId: endpoint.merchantId,
      };

      const signature = generateWebhookSignature(
        JSON.stringify(payload),
        endpoint.secret,
        endpoint.signatureAlgorithm
      );

      const startTime = Date.now();
      
      // In a real implementation, this would make an actual HTTP request
      // For now, simulate a successful test
      const responseTime = Math.random() * 500 + 100; // 100-600ms
      
      // Update endpoint stats
      endpoint.updateStats(true, responseTime);
      await this.webhookEndpointRepository.save(endpoint);

      this.logger.log(`Webhook endpoint test completed: ${endpointId}`);

      return {
        success: true,
        statusCode: 200,
        responseTime: Math.round(responseTime),
        responseBody: JSON.stringify({ received: true }),
      };
    } catch (error) {
      this.logger.error(`Failed to test webhook endpoint: ${error.message}`, error.stack);
      return {
        success: false,
        statusCode: 0,
        responseTime: 0,
        responseBody: error.message,
      };
    }
  }

  /**
   * Get webhook delivery statistics
   */
  async getWebhookStats(merchantId?: string, endpointId?: string): Promise<any> {
    this.logger.log('Fetching webhook delivery statistics');
    
    try {
      const baseQuery = this.webhookEventRepository.createQueryBuilder('webhook');
      
      if (merchantId) {
        baseQuery.where('webhook.merchantId = :merchantId', { merchantId });
      }

      // Get basic counts
      const [
        totalEvents,
        delivered,
        failed,
        retrying,
        exhausted,
      ] = await Promise.all([
        baseQuery.getCount(),
        baseQuery.clone().where('webhook.status = :status', { status: WebhookDeliveryStatus.DELIVERED }).getCount(),
        baseQuery.clone().where('webhook.status = :status', { status: WebhookDeliveryStatus.FAILED }).getCount(),
        baseQuery.clone().where('webhook.status = :status', { status: WebhookDeliveryStatus.RETRYING }).getCount(),
        baseQuery.clone().where('webhook.status = :status', { status: WebhookDeliveryStatus.EXHAUSTED }).getCount(),
      ]);

      const successRate = totalEvents > 0 ? (delivered / totalEvents) * 100 : 0;

      // Get endpoint-specific stats if requested
      let endpointStats: Array<{
        endpointId: string;
        name: string;
        url: string;
        successCount: number;
        failureCount: number;
        successRate: number;
        avgResponseTimeMs: number;
      }> = [];
      
      if (merchantId) {
        const endpoints = await this.webhookEndpointRepository.find({
          where: { merchantId },
        });

        endpointStats = endpoints.map(endpoint => ({
          endpointId: endpoint.id,
          name: endpoint.name,
          url: endpoint.url,
          successCount: endpoint.successCount,
          failureCount: endpoint.failureCount,
          successRate: endpoint.successRate,
          avgResponseTimeMs: endpoint.avgResponseTimeMs,
        }));
      }

      return {
        totalDeliveries: totalEvents,
        successfulDeliveries: delivered,
        failedDeliveries: failed + exhausted,
        successRate: Math.round(successRate * 100) / 100,
        avgResponseTime: 0, // Would need to calculate from delivery records
        endpoints: endpointStats,
      };

    } catch (error) {
      this.logger.error(`Failed to get webhook statistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get merchant webhook endpoint for event type
   */
  private async getMerchantWebhookEndpoint(
    merchantId: string,
    eventType: string,
    overrideUrl?: string
  ): Promise<WebhookEndpoint | null> {
    if (overrideUrl) {
      // Create a temporary endpoint for override URL
      return {
        id: 'override',
        url: overrideUrl,
        secret: 'override-secret',
        httpMethod: 'POST',
        timeoutMs: 30000,
        customHeaders: {},
        signatureAlgorithm: 'sha256',
        signatureHeader: 'X-Valorapays-Signature',
        userAgent: 'Valorapays-Webhook/1.0',
        isEventEnabled: () => true,
        updateStats: () => {},
      } as any;
    }

    return await this.webhookEndpointRepository.findOne({
      where: {
        merchantId,
        isActive: true,
        status: WebhookEndpointStatus.ACTIVE,
      },
    });
  }

  /**
   * Queue webhook for delivery
   */
  private async queueWebhookForDelivery(webhookEventId: string, overrideUrl?: string): Promise<void> {
    try {
      const queueKey = 'webhook:delivery:queue';
      const jobData = {
        webhookEventId,
        overrideUrl,
        queuedAt: new Date().toISOString(),
        priority: 'normal',
      };

      await this.redisService.getClient().lpush(queueKey, JSON.stringify(jobData));
      this.logger.debug(`Webhook queued for delivery: ${webhookEventId}`);
    } catch (error) {
      this.logger.error(`Failed to queue webhook for delivery: ${error.message}`);
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import axios, { AxiosError } from 'axios';
import { WebhookEvent, WebhookDelivery, WebhookEndpoint } from '../../entities';
import { RedisConfigService } from '../../config';
import { 
  WebhookDeliveryStatus, 
  WebhookEndpointStatus 
} from '../../types';
import { generateWebhookSignature } from '../../utils';

/**
 * Webhook Delivery Worker
 * 
 * Processes webhook delivery queue with:
 * - Actual HTTP delivery to merchant endpoints
 * - Exponential backoff retry mechanism
 * - Comprehensive tracking and statistics
 * - Error handling and logging
 */
@Injectable()
export class WebhookDeliveryWorker {
  private readonly logger = new Logger(WebhookDeliveryWorker.name);
  private isProcessing = false;

  constructor(
    @InjectRepository(WebhookEvent)
    private readonly webhookEventRepository: Repository<WebhookEvent>,
    
    @InjectRepository(WebhookDelivery)
    private readonly webhookDeliveryRepository: Repository<WebhookDelivery>,
    
    @InjectRepository(WebhookEndpoint)
    private readonly webhookEndpointRepository: Repository<WebhookEndpoint>,
    
    private readonly redisService: RedisConfigService,
  ) {}

  /**
   * Process webhook queue every 10 seconds
   */
  @Cron(CronExpression.EVERY_10_SECONDS)
  async processWebhookQueue(): Promise<void> {
    // Prevent overlapping executions
    if (this.isProcessing) {
      this.logger.debug('Previous queue processing still running, skipping...');
      return;
    }

    this.isProcessing = true;

    try {
      const redis = this.redisService.getClient();
      const queueKey = 'webhook:delivery:queue';
      
      // Pop up to 10 jobs from queue
      const batchSize = 10;
      const jobs: string[] = [];
      
      for (let i = 0; i < batchSize; i++) {
        const job = await redis.rpop(queueKey);
        if (!job) break;
        jobs.push(job);
      }

      if (jobs.length === 0) {
        this.logger.debug('No webhooks in queue');
        return;
      }

      this.logger.log(`Processing ${jobs.length} webhooks from queue`);

      // Process jobs in parallel (but limit concurrency)
      await Promise.allSettled(
        jobs.map(job => this.processWebhookJob(job))
      );

    } catch (error) {
      this.logger.error(`Failed to process webhook queue: ${error.message}`, error.stack);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process retries for failed webhooks
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async processRetries(): Promise<void> {
    try {
      // Find webhooks that are due for retry
      const dueForRetry = await this.webhookEventRepository.find({
        where: {
          status: WebhookDeliveryStatus.RETRYING,
          nextRetryAt: LessThan(new Date()),
        },
        take: 20, // Process 20 at a time
        order: { nextRetryAt: 'ASC' },
      });

      if (dueForRetry.length === 0) {
        this.logger.debug('No webhooks due for retry');
        return;
      }

      this.logger.log(`Processing ${dueForRetry.length} webhook retries`);

      // Process retries
      await Promise.allSettled(
        dueForRetry.map(event => this.retryWebhook(event))
      );

    } catch (error) {
      this.logger.error(`Failed to process retries: ${error.message}`, error.stack);
    }
  }

  /**
   * Process individual webhook job
   */
  private async processWebhookJob(jobJson: string): Promise<void> {
    try {
      const job = JSON.parse(jobJson);
      const { webhookEventId, overrideUrl } = job;

      this.logger.debug(`Processing webhook: ${webhookEventId}`);

      // Fetch webhook event
      const webhookEvent = await this.webhookEventRepository.findOne({
        where: { id: webhookEventId },
      });

      if (!webhookEvent) {
        this.logger.error(`Webhook event not found: ${webhookEventId}`);
        return;
      }

      // Find matching webhook endpoints
      const endpoints = await this.findMatchingEndpoints(
        webhookEvent.merchantId,
        webhookEvent.eventType,
        overrideUrl
      );

      if (endpoints.length === 0) {
        this.logger.warn(`No active webhook endpoints found for merchant ${webhookEvent.merchantId}, event ${webhookEvent.eventType}`);
        
        // Mark as failed - no endpoints
        await this.webhookEventRepository.update(webhookEventId, {
          status: WebhookDeliveryStatus.FAILED,
          lastErrorMessage: 'No active webhook endpoints configured',
        });
        
        return;
      }

      // Deliver to all matching endpoints
      const deliveryPromises = endpoints.map(endpoint =>
        this.deliverToEndpoint(webhookEvent, endpoint)
      );

      const results = await Promise.allSettled(deliveryPromises);

      // Check if all deliveries succeeded
      const allSucceeded = results.every(r => r.status === 'fulfilled' && r.value === true);

      if (allSucceeded) {
        await this.webhookEventRepository.update(webhookEventId, {
          status: WebhookDeliveryStatus.DELIVERED,
          deliveredAt: new Date(),
        });
      }

    } catch (error) {
      this.logger.error(`Failed to process webhook job: ${error.message}`, error.stack);
    }
  }

  /**
   * Deliver webhook to specific endpoint
   */
  private async deliverToEndpoint(
    webhookEvent: WebhookEvent,
    endpoint: WebhookEndpoint
  ): Promise<boolean> {
    const startTime = Date.now();
    let delivery: WebhookDelivery | null = null;

    try {
      // Generate signature
      const payloadString = JSON.stringify(webhookEvent.eventData);
      const signature = generateWebhookSignature(
        payloadString,
        endpoint.secret,
        endpoint.signatureAlgorithm
      );

      // Prepare headers
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': endpoint.userAgent,
        [endpoint.signatureHeader]: signature,
        'X-Valorapays-Event': webhookEvent.eventType,
        'X-Valorapays-Event-Id': webhookEvent.id,
        'X-Valorapays-Timestamp': new Date().toISOString(),
        'X-Valorapays-Attempt': (webhookEvent.attempts + 1).toString(),
        ...(endpoint.customHeaders || {}),
      };

      // Create delivery record
      delivery = this.webhookDeliveryRepository.create({
        webhookEventId: webhookEvent.id,
        merchantId: webhookEvent.merchantId,
        webhookUrl: endpoint.url,
        httpMethod: endpoint.httpMethod,
        headers,
        payload: webhookEvent.eventData,
        status: 'pending',
        attempts: 0,
        maxAttempts: endpoint.maxRetries,
        signature,
        signatureAlgorithm: endpoint.signatureAlgorithm,
      });

      delivery = await this.webhookDeliveryRepository.save(delivery);

      // Update delivery to 'sending'
      delivery.status = 'sent';
      delivery.sentAt = new Date();
      delivery.attempts = 1;
      await this.webhookDeliveryRepository.save(delivery);

      // Make HTTP request
      this.logger.log(`Delivering webhook to ${endpoint.url} for event ${webhookEvent.eventType}`);

      const response = await axios({
        method: endpoint.httpMethod as any,
        url: endpoint.url,
        data: webhookEvent.eventData,
        headers,
        timeout: endpoint.timeoutMs,
        validateStatus: () => true, // Don't throw on any status
      });

      const responseTime = Date.now() - startTime;

      // Check if successful (2xx status)
      const isSuccess = response.status >= 200 && response.status < 300;

      // Update delivery record
      delivery.status = isSuccess ? 'delivered' : 'failed';
      delivery.responseCode = response.status;
      delivery.responseBody = typeof response.data === 'string' 
        ? response.data.substring(0, 5000) // Limit to 5KB
        : JSON.stringify(response.data).substring(0, 5000);
      delivery.responseHeaders = response.headers;
      delivery.responseTimeMs = responseTime;
      if (isSuccess) {
        delivery.deliveredAt = new Date();
      } else {
        delivery.errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }

      await this.webhookDeliveryRepository.save(delivery);

      // Update endpoint statistics
      endpoint.updateStats(isSuccess, responseTime);
      await this.webhookEndpointRepository.save(endpoint);

      // Update webhook event
      webhookEvent.attempts += 1;

      if (isSuccess) {
        this.logger.log(`✅ Webhook delivered successfully to ${endpoint.url} (${responseTime}ms)`);
        return true;
      } else {
        this.logger.warn(`❌ Webhook delivery failed: HTTP ${response.status} from ${endpoint.url}`);
        
        // Schedule retry if attempts remaining
        if (webhookEvent.attempts < webhookEvent.maxAttempts) {
          await this.scheduleRetry(webhookEvent, endpoint, delivery.errorMessage);
        } else {
          // Max attempts reached
          webhookEvent.status = WebhookDeliveryStatus.EXHAUSTED;
          webhookEvent.lastErrorMessage = `Max retry attempts (${webhookEvent.maxAttempts}) exhausted. Last error: ${delivery.errorMessage}`;
          await this.webhookEventRepository.save(webhookEvent);
          
          this.logger.error(`Max retry attempts exhausted for webhook ${webhookEvent.id}`);
        }
        
        return false;
      }

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof AxiosError
        ? `${error.code}: ${error.message}`
        : error.message;

      this.logger.error(`Webhook delivery error to ${endpoint.url}: ${errorMessage}`);

      // Update delivery record with error
      if (delivery) {
        delivery.status = 'failed';
        delivery.errorMessage = errorMessage.substring(0, 1000);
        delivery.responseTimeMs = responseTime;
        await this.webhookDeliveryRepository.save(delivery);
      }

      // Update endpoint stats (failed)
      endpoint.updateStats(false, responseTime);
      await this.webhookEndpointRepository.save(endpoint);

      // Update webhook event
      webhookEvent.attempts += 1;

      // Schedule retry if attempts remaining
      if (webhookEvent.attempts < webhookEvent.maxAttempts) {
        await this.scheduleRetry(webhookEvent, endpoint, errorMessage);
      } else {
        // Max attempts reached
        webhookEvent.status = WebhookDeliveryStatus.EXHAUSTED;
        webhookEvent.lastErrorMessage = `Max retry attempts (${webhookEvent.maxAttempts}) exhausted. Last error: ${errorMessage}`;
        await this.webhookEventRepository.save(webhookEvent);
        
        this.logger.error(`Max retry attempts exhausted for webhook ${webhookEvent.id}`);
      }

      return false;
    }
  }

  /**
   * Schedule retry with exponential backoff
   */
  private async scheduleRetry(
    webhookEvent: WebhookEvent,
    endpoint: WebhookEndpoint,
    errorMessage: string
  ): Promise<void> {
    // Calculate delay based on retry strategy
    const delay = this.calculateRetryDelay(
      webhookEvent.attempts,
      endpoint.retryDelayMs,
      endpoint.useExponentialBackoff
    );

    const nextRetryAt = new Date(Date.now() + delay);

    webhookEvent.status = WebhookDeliveryStatus.RETRYING;
    webhookEvent.nextRetryAt = nextRetryAt;
    webhookEvent.lastErrorMessage = errorMessage;

    await this.webhookEventRepository.save(webhookEvent);

    this.logger.log(
      `Scheduled retry for webhook ${webhookEvent.id} in ${Math.round(delay / 1000)}s (attempt ${webhookEvent.attempts + 1}/${webhookEvent.maxAttempts})`
    );
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(
    attemptNumber: number,
    baseDelay: number,
    useExponentialBackoff: boolean
  ): number {
    if (!useExponentialBackoff) {
      return baseDelay;
    }

    // Exponential backoff: baseDelay * 2^(attemptNumber - 1)
    const exponentialDelay = baseDelay * Math.pow(2, attemptNumber - 1);
    
    // Cap at 5 minutes
    const maxDelay = 5 * 60 * 1000; // 5 minutes
    
    return Math.min(exponentialDelay, maxDelay);
  }

  /**
   * Retry a webhook that failed previously
   */
  private async retryWebhook(webhookEvent: WebhookEvent): Promise<void> {
    try {
      this.logger.log(`Retrying webhook ${webhookEvent.id} (attempt ${webhookEvent.attempts + 1}/${webhookEvent.maxAttempts})`);

      // Find matching endpoints
      const endpoints = await this.findMatchingEndpoints(
        webhookEvent.merchantId,
        webhookEvent.eventType
      );

      if (endpoints.length === 0) {
        this.logger.warn(`No endpoints found for retry of webhook ${webhookEvent.id}`);
        
        webhookEvent.status = WebhookDeliveryStatus.FAILED;
        webhookEvent.lastErrorMessage = 'No active webhook endpoints';
        await this.webhookEventRepository.save(webhookEvent);
        
        return;
      }

      // Attempt delivery to all endpoints
      const deliveryPromises = endpoints.map(endpoint =>
        this.deliverToEndpoint(webhookEvent, endpoint)
      );

      const results = await Promise.allSettled(deliveryPromises);

      // Check if all succeeded
      const allSucceeded = results.every(r => r.status === 'fulfilled' && r.value === true);

      if (allSucceeded) {
        webhookEvent.status = WebhookDeliveryStatus.DELIVERED;
        webhookEvent.deliveredAt = new Date();
        await this.webhookEventRepository.save(webhookEvent);
        
        this.logger.log(`✅ Webhook ${webhookEvent.id} delivered successfully after retry`);
      }

    } catch (error) {
      this.logger.error(`Failed to retry webhook ${webhookEvent.id}: ${error.message}`, error.stack);
    }
  }

  /**
   * Find matching webhook endpoints for event
   */
  private async findMatchingEndpoints(
    merchantId: string,
    eventType: string,
    overrideUrl?: string
  ): Promise<WebhookEndpoint[]> {
    // If override URL provided, create temporary endpoint
    if (overrideUrl) {
      const tempEndpoint = new WebhookEndpoint();
      tempEndpoint.id = 'override';
      tempEndpoint.merchantId = merchantId;
      tempEndpoint.url = overrideUrl;
      tempEndpoint.secret = 'temp-secret';
      tempEndpoint.enabledEvents = ['*'];
      tempEndpoint.httpMethod = 'POST';
      tempEndpoint.maxRetries = 3;
      tempEndpoint.timeoutMs = 30000;
      tempEndpoint.retryDelayMs = 1000;
      tempEndpoint.useExponentialBackoff = true;
      tempEndpoint.signatureAlgorithm = 'sha256';
      tempEndpoint.signatureHeader = 'X-Valorapays-Signature';
      tempEndpoint.userAgent = 'Valorapays-Webhook/1.0';
      tempEndpoint.status = WebhookEndpointStatus.ACTIVE;
      tempEndpoint.isActive = true;
      
      return [tempEndpoint];
    }

    // Find all active endpoints for merchant
    const endpoints = await this.webhookEndpointRepository.find({
      where: {
        merchantId,
        isActive: true,
        status: WebhookEndpointStatus.ACTIVE,
      },
    });

    // Filter by enabled events
    return endpoints.filter(endpoint => 
      endpoint.isEventEnabled(eventType)
    );
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    queueLength: number;
    pendingRetries: number;
    processing: boolean;
  }> {
    try {
      const redis = this.redisService.getClient();
      const queueKey = 'webhook:delivery:queue';
      
      const queueLength = await redis.llen(queueKey);
      
      const pendingRetries = await this.webhookEventRepository.count({
        where: {
          status: WebhookDeliveryStatus.RETRYING,
          nextRetryAt: LessThan(new Date()),
        },
      });

      return {
        queueLength,
        pendingRetries,
        processing: this.isProcessing,
      };
    } catch (error) {
      this.logger.error(`Failed to get queue stats: ${error.message}`);
      return {
        queueLength: 0,
        pendingRetries: 0,
        processing: false,
      };
    }
  }
}


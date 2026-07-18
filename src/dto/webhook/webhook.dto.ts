import { IsString, IsUUID, IsOptional, IsObject, IsNumber, IsBoolean, IsIn, IsDateString, IsArray, IsUrl, ValidateNested } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from '../common/pagination.dto';

/**
 * Create Outbound Webhook Event DTO
 */
export class CreateWebhookEventDto {
  @ApiProperty({
    description: 'Event type',
    enum: [
      'payment.success', 'payment.failed', 'payment.pending', 'payment.cancelled',
      'refund.initiated', 'refund.completed', 'refund.failed',
      'settlement.initiated', 'settlement.completed', 'settlement.failed',
      'chargeback.initiated', 'chargeback.resolved',
      'payout.initiated', 'payout.completed', 'payout.failed'
    ],
  })
  @IsString()
  @IsIn([
    'payment.success', 'payment.failed', 'payment.pending', 'payment.cancelled',
    'refund.initiated', 'refund.completed', 'refund.failed',
    'settlement.initiated', 'settlement.completed', 'settlement.failed',
    'chargeback.initiated', 'chargeback.resolved',
    'payout.initiated', 'payout.completed', 'payout.failed'
  ])
  eventType: string;

  @ApiProperty({ description: 'Merchant ID to deliver webhook to' })
  @IsString()
  merchantId: string;

  @ApiProperty({ description: 'Event data payload' })
  @IsObject()
  eventData: any;

  @ApiProperty({ description: 'Transaction ID', required: false })
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiProperty({ description: 'Payment ID', required: false })
  @IsOptional()
  @IsString()
  paymentId?: string;

  @ApiProperty({ description: 'Refund ID', required: false })
  @IsOptional()
  @IsString()
  refundId?: string;

  @ApiProperty({ description: 'Settlement ID', required: false })
  @IsOptional()
  @IsString()
  settlementId?: string;

  @ApiProperty({ description: 'Chargeback ID', required: false })
  @IsOptional()
  @IsString()
  chargebackId?: string;

  @ApiProperty({ description: 'Payout ID', required: false })
  @IsOptional()
  @IsString()
  payoutId?: string;

  @ApiProperty({ description: 'Amount', required: false })
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiProperty({ description: 'Currency', required: false })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: 'Entity status', required: false })
  @IsOptional()
  @IsString()
  entityStatus?: string;

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsOptional()
  @IsObject()
  metadata?: any;

  @ApiProperty({ description: 'Scheduled delivery time', required: false })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiProperty({ description: 'Source service that created this webhook', required: false })
  @IsOptional()
  @IsString()
  sourceService?: string;

  @ApiProperty({ description: 'Override webhook URL for this delivery', required: false })
  @IsOptional()
  @IsUrl()
  webhookUrl?: string;
}

/**
 * Webhook Event Response DTO
 */
export class WebhookEventResponseDto {
  @ApiProperty({ description: 'Webhook event ID' })
  id: string;

  @ApiProperty({ description: 'Event type' })
  eventType: string;

  @ApiProperty({ description: 'Merchant ID' })
  merchantId: string;

  @ApiProperty({ description: 'Transaction ID', required: false })
  transactionId?: string;

  @ApiProperty({ description: 'Payment ID', required: false })
  paymentId?: string;

  @ApiProperty({ description: 'Amount', required: false })
  amount?: number;

  @ApiProperty({ description: 'Currency', required: false })
  currency?: string;

  @ApiProperty({ description: 'Entity status', required: false })
  entityStatus?: string;

  @ApiProperty({ description: 'Delivery status' })
  status: string;

  @ApiProperty({ description: 'Number of delivery attempts' })
  attempts: number;

  @ApiProperty({ description: 'Maximum delivery attempts' })
  maxAttempts: number;

  @ApiProperty({ description: 'Scheduled delivery time', required: false })
  scheduledAt?: Date;

  @ApiProperty({ description: 'When successfully delivered', required: false })
  deliveredAt?: Date;

  @ApiProperty({ description: 'Next retry time', required: false })
  nextRetryAt?: Date;

  @ApiProperty({ description: 'Last error message', required: false })
  lastErrorMessage?: string;

  @ApiProperty({ description: 'When the webhook was created' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

/**
 * Webhook Event Filter DTO
 */
export class WebhookEventFilterDto extends PaginationDto {
  @ApiProperty({ description: 'Filter by event type', required: false })
  @IsOptional()
  @IsString()
  eventType?: string;

  @ApiProperty({ description: 'Filter by merchant ID', required: false })
  @IsOptional()
  @IsString()
  merchantId?: string;

  @ApiProperty({ description: 'Filter by delivery status', required: false })
  @IsOptional()
  @IsIn(['pending', 'delivered', 'failed', 'retrying', 'exhausted'])
  status?: string;

  @ApiProperty({ description: 'Filter by transaction ID', required: false })
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiProperty({ description: 'Start date for filtering', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: 'End date for filtering', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

/**
 * Webhook Endpoint Configuration DTO
 */
export class CreateWebhookEndpointDto {
  @ApiProperty({ description: 'Merchant ID' })
  @IsString()
  merchantId: string;

  @ApiProperty({ description: 'Endpoint name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Webhook URL' })
  @IsUrl()
  url: string;

  @ApiProperty({ description: 'Secret key for signing webhooks' })
  @IsString()
  secret: string;

  @ApiProperty({ 
    description: 'Enabled event types',
    type: [String],
    example: ['payment.success', 'payment.failed', 'refund.completed']
  })
  @IsArray()
  @IsString({ each: true })
  enabledEvents: string[];

  @ApiProperty({ description: 'HTTP method', enum: ['POST', 'PUT'], default: 'POST' })
  @IsOptional()
  @IsIn(['POST', 'PUT'])
  httpMethod?: string;

  @ApiProperty({ description: 'Custom headers', required: false })
  @IsOptional()
  @IsObject()
  customHeaders?: any;

  @ApiProperty({ description: 'Maximum retry attempts', default: 3 })
  @IsOptional()
  @IsNumber()
  maxRetries?: number;

  @ApiProperty({ description: 'Request timeout in milliseconds', default: 30000 })
  @IsOptional()
  @IsNumber()
  timeoutMs?: number;

  @ApiProperty({ description: 'Base retry delay in milliseconds', default: 1000 })
  @IsOptional()
  @IsNumber()
  retryDelayMs?: number;

  @ApiProperty({ description: 'Use exponential backoff for retries', default: true })
  @IsOptional()
  @IsBoolean()
  useExponentialBackoff?: boolean;

  @ApiProperty({ description: 'Signature algorithm', enum: ['sha256', 'sha512'], default: 'sha256' })
  @IsOptional()
  @IsIn(['sha256', 'sha512'])
  signatureAlgorithm?: string;
}

/**
 * Update Webhook Endpoint DTO
 */
export class UpdateWebhookEndpointDto {
  @ApiProperty({ description: 'Endpoint name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Webhook URL', required: false })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiProperty({ description: 'Secret key for signing webhooks', required: false })
  @IsOptional()
  @IsString()
  secret?: string;

  @ApiProperty({ description: 'Whether endpoint is active', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: 'Enabled event types', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledEvents?: string[];

  @ApiProperty({ description: 'Custom headers', required: false })
  @IsOptional()
  @IsObject()
  customHeaders?: any;

  @ApiProperty({ description: 'Maximum retry attempts', required: false })
  @IsOptional()
  @IsNumber()
  maxRetries?: number;

  @ApiProperty({ description: 'Request timeout in milliseconds', required: false })
  @IsOptional()
  @IsNumber()
  timeoutMs?: number;
}

/**
 * Webhook Endpoint Response DTO
 */
export class WebhookEndpointResponseDto {
  @ApiProperty({ description: 'Endpoint ID' })
  id: string;

  @ApiProperty({ description: 'Merchant ID' })
  merchantId: string;

  @ApiProperty({ description: 'Endpoint name' })
  name: string;

  @ApiProperty({ description: 'Webhook URL' })
  url: string;

  @ApiProperty({ description: 'Endpoint status' })
  status: string;

  @ApiProperty({ description: 'Whether endpoint is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Enabled event types' })
  enabledEvents: string[];

  @ApiProperty({ description: 'HTTP method' })
  httpMethod: string;

  @ApiProperty({ description: 'Maximum retry attempts' })
  maxRetries: number;

  @ApiProperty({ description: 'Request timeout in milliseconds' })
  timeoutMs: number;

  @ApiProperty({ description: 'Last successful delivery', required: false })
  lastSuccessAt?: Date;

  @ApiProperty({ description: 'Last failed delivery', required: false })
  lastFailureAt?: Date;

  @ApiProperty({ description: 'Success count' })
  successCount: number;

  @ApiProperty({ description: 'Failure count' })
  failureCount: number;

  @ApiProperty({ description: 'Success rate percentage' })
  successRate: number;

  @ApiProperty({ description: 'Consecutive failures' })
  consecutiveFailures: number;

  @ApiProperty({ description: 'Whether endpoint is verified' })
  isVerified: boolean;

  @ApiProperty({ description: 'When the endpoint was created' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

/**
 * Test Webhook DTO
 */
export class TestWebhookDto {
  @ApiProperty({ description: 'Webhook endpoint ID' })
  @IsString()
  endpointId: string;

  @ApiProperty({ description: 'Test event type', default: 'payment.success' })
  @IsOptional()
  @IsString()
  eventType?: string;

  @ApiProperty({ description: 'Test payload', required: false })
  @IsOptional()
  @IsObject()
  testPayload?: any;
}

/**
 * Webhook Delivery Statistics DTO
 */
export class WebhookDeliveryStatsDto {
  @ApiProperty({ description: 'Total webhook events created' })
  totalEvents: number;

  @ApiProperty({ description: 'Successfully delivered webhooks' })
  delivered: number;

  @ApiProperty({ description: 'Failed webhook deliveries' })
  failed: number;

  @ApiProperty({ description: 'Webhooks currently being retried' })
  retrying: number;

  @ApiProperty({ description: 'Webhooks with exhausted retries' })
  exhausted: number;

  @ApiProperty({ description: 'Success rate percentage' })
  successRate: number;

  @ApiProperty({ description: 'Average delivery time in milliseconds' })
  avgDeliveryTimeMs: number;

  @ApiProperty({ description: 'Statistics by event type' })
  byEventType: {
    [eventType: string]: {
      total: number;
      delivered: number;
      failed: number;
      successRate: number;
    };
  };

  @ApiProperty({ description: 'Statistics by merchant' })
  byMerchant: {
    [merchantId: string]: {
      total: number;
      delivered: number;
      failed: number;
      successRate: number;
    };
  };
}

/**
 * Retry Webhook DTO
 */
export class RetryWebhookDto {
  @ApiProperty({ description: 'Webhook event ID' })
  @IsString()
  eventId: string;

  @ApiProperty({ description: 'Force retry even if max attempts reached', default: false })
  @IsOptional()
  @IsBoolean()
  forceRetry?: boolean;

  @ApiProperty({ description: 'Override webhook URL for this retry', required: false })
  @IsOptional()
  @IsUrl()
  overrideUrl?: string;
}
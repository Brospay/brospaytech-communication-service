/**
 * Outbound Webhook Delivery Types and Enums
 * For delivering events from Valorapays to merchant servers
 */

export enum WebhookEventType {
  PAYMENT_SUCCEEDED = 'payment.succeeded',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_PENDING = 'payment.pending',
  PAYMENT_CANCELLED = 'payment.cancelled',
  REFUND_INITIATED = 'refund.initiated',
  REFUND_COMPLETED = 'refund.completed',
  REFUND_FAILED = 'refund.failed',
  SETTLEMENT_INITIATED = 'settlement.initiated',
  SETTLEMENT_COMPLETED = 'settlement.completed',
  SETTLEMENT_FAILED = 'settlement.failed',
  CHARGEBACK_INITIATED = 'chargeback.initiated',
  CHARGEBACK_RESOLVED = 'chargeback.resolved',
  PAYOUT_INITIATED = 'payout.initiated',
  PAYOUT_COMPLETED = 'payout.completed',
  PAYOUT_FAILED = 'payout.failed',
}

export enum WebhookDeliveryStatus {
  PENDING = 'pending',
  SENDING = 'sending',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  RETRYING = 'retrying',
  EXHAUSTED = 'exhausted',
  DISABLED = 'disabled',
}

export enum WebhookEndpointStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  FAILED = 'failed',
  DISABLED = 'disabled',
}

export interface WebhookEventData {
  eventType: WebhookEventType;
  merchantId: string;
  transactionId?: string;
  paymentId?: string;
  refundId?: string;
  settlementId?: string;
  chargebackId?: string;
  payoutId?: string;
  amount?: number;
  currency?: string;
  status?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface WebhookDeliveryRequest {
  merchantId: string;
  eventType: WebhookEventType;
  eventData: WebhookEventData;
  webhookUrl?: string;
  retryCount?: number;
  scheduledAt?: Date;
}

export interface WebhookDeliveryResult {
  success: boolean;
  deliveryId: string;
  httpStatus?: number;
  responseBody?: string;
  responseHeaders?: Record<string, string>;
  deliveryTimeMs: number;
  errorMessage?: string;
  shouldRetry?: boolean;
  nextRetryAt?: Date;
}

export interface WebhookEndpointConfig {
  url: string;
  secret: string;
  enabledEvents: WebhookEventType[];
  isActive: boolean;
  maxRetries: number;
  retryDelayMs: number;
  timeoutMs: number;
  customHeaders?: Record<string, string>;
}

export interface WebhookRetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  exponentialBackoff: boolean;
  retryableStatusCodes: number[];
}

/**
 * Event Streaming Types
 */

// Event Stream Status Enum
export enum EventStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  RETRYING = 'retrying',
  EXPIRED = 'expired',
}

// Event Priority Enum
export enum EventPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical',
  URGENT = 'urgent',
}

// Event Source Type Enum
export enum EventSourceType {
  PAYMENT = 'payment',
  TRANSACTION = 'transaction',
  MERCHANT = 'merchant',
  USER = 'user',
  SYSTEM = 'system',
  WEBHOOK = 'webhook',
  API = 'api',
}

// Event Stream Type Enum
export enum EventStreamType {
  PAYMENT_CREATED = 'payment.created',
  PAYMENT_UPDATED = 'payment.updated',
  PAYMENT_COMPLETED = 'payment.completed',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_CANCELLED = 'payment.cancelled',
  REFUND_INITIATED = 'refund.initiated',
  REFUND_COMPLETED = 'refund.completed',
  REFUND_FAILED = 'refund.failed',
  SETTLEMENT_INITIATED = 'settlement.initiated',
  SETTLEMENT_COMPLETED = 'settlement.completed',
  SETTLEMENT_FAILED = 'settlement.failed',
  WEBHOOK_DELIVERY = 'webhook.delivery',
  NOTIFICATION_SENT = 'notification.sent',
  ALERT_CREATED = 'alert.created',
  SYSTEM_HEALTH = 'system.health',
  SYSTEM_ALERT = 'system.alert',
  WALLET_BALANCE_UPDATED = 'wallet.balance.updated',
  MERCHANT_STATUS_UPDATED = 'merchant.status.updated',
}

// Event Stream Channel Enum
export enum EventStreamChannel {
  MERCHANT_DASHBOARD = 'merchant-dashboard',
  ADMIN_DASHBOARD = 'admin-dashboard',
  CUSTOMER_PORTAL = 'customer-portal',
  SYSTEM_MONITORING = 'system-monitoring',
  WEBHOOK_DELIVERY = 'webhook-delivery',
  NOTIFICATION_QUEUE = 'notification-queue',
  PAYMENT_PROCESSING = 'payment-processing',
  SETTLEMENT_PROCESSING = 'settlement-processing',
  PAYMENT_UPDATES = 'payment-updates',
  WALLET_UPDATES = 'wallet-updates',
  SYSTEM_ALERTS = 'system-alerts',
  NOTIFICATIONS = 'notifications',
  GLOBAL = 'global',
}

// Event Status Alias for backward compatibility
export const EventStreamStatus = EventStatus;
export const EventStreamPriority = EventPriority;
export const EventStreamSourceType = EventSourceType;

// Type aliases for use in DTOs
export type EventStreamPriorityType = `${EventPriority}`;
export type EventStreamSourceTypeType = `${EventSourceType}`;
export type EventStreamStatusType = `${EventStatus}`;
export type EventStreamTypeType = `${EventStreamType}`;
export type EventStreamChannelType = `${EventStreamChannel}`;

// Event Stream Payload Interface
export interface EventStreamPayload {
  id: string;
  type: string;
  timestamp: string;
  data: any;
  metadata?: Record<string, any>;
}

// Event Broadcast Result Interface
export interface EventBroadcastResult {
  eventId: string;
  channel?: string;
  successCount: number;
  failureCount: number;
  totalRecipients: number;
  deliveredCount: number;
  recipientCount: number;
  deliveryTimeMs: number;
  processingTimeMs: number;
  errors: Array<{
    recipientId: string;
    error: string;
  }>;
}

// WebSocket Subscription Interface
export interface WebSocketSubscription {
  id: string;
  userId: string;
  channels: string[];
  eventTypes: string[];
  isActive: boolean;
  connectedAt: Date;
  lastActivityAt: Date;
}

// Event Stats Interfaces
export interface EventStats {
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  pendingEvents: number;
  avgProcessingTime: number;
  channelStats: ChannelEventStats[];
  eventTypeStats: EventTypeStats[];
}

export interface ChannelEventStats {
  channel: string;
  totalEvents: number;
  successRate: number;
  avgDeliveryTime: number;
}

export interface EventTypeStats {
  eventType: string;
  totalEvents: number;
  successRate: number;
  avgProcessingTime: number;
}

// Export Kafka and WebSocket types
export * from './kafka.types';
export * from './websocket.types';

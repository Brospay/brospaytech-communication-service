/**
 * Event Stream Types and Enums
 */

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
  WALLET_BALANCE_UPDATED = 'wallet.balance.updated',
  WALLET_TRANSACTION_CREATED = 'wallet.transaction.created',
  MERCHANT_STATUS_UPDATED = 'merchant.status.updated',
  MERCHANT_KYC_UPDATED = 'merchant.kyc.updated',
  SYSTEM_ALERT = 'system.alert',
  SYSTEM_MAINTENANCE = 'system.maintenance',
  NOTIFICATION_SENT = 'notification.sent',
  WEBHOOK_DELIVERED = 'webhook.delivered',
  WEBHOOK_FAILED = 'webhook.failed',
}

export enum EventStreamStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

export enum EventStreamPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum EventStreamChannel {
  MERCHANT_DASHBOARD = 'merchant-dashboard',
  ADMIN_DASHBOARD = 'admin-dashboard',
  PAYMENT_UPDATES = 'payment-updates',
  WALLET_UPDATES = 'wallet-updates',
  SYSTEM_ALERTS = 'system-alerts',
  NOTIFICATIONS = 'notifications',
  WEBHOOKS = 'webhooks',
  GLOBAL = 'global',
}

export enum EventStreamSourceType {
  PAYMENT = 'payment',
  WALLET = 'wallet',
  MERCHANT = 'merchant',
  ADMIN = 'admin',
  SYSTEM = 'system',
  WEBHOOK = 'webhook',
  NOTIFICATION = 'notification',
}

export interface EventStreamPayload {
  eventType: EventStreamType;
  sourceId?: string;
  sourceType?: EventStreamSourceType;
  entityId?: string;
  entityType?: string;
  data: Record<string, any>;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface EventStreamRecipient {
  id: string;
  type: 'user' | 'merchant' | 'admin' | 'system';
  channels: EventStreamChannel[];
  rooms?: string[];
  filters?: Record<string, any>;
}

export interface EventBroadcastResult {
  eventId: string;
  channel: string;
  recipientCount: number;
  deliveredCount: number;
  failedCount: number;
  deliveryTimeMs: number;
  errors?: string[];
}

export interface KafkaEventMessage {
  topic: string;
  partition: number;
  offset: string;
  key: string;
  value: any;
  timestamp: number;
  headers?: Record<string, string>;
}

export interface WebSocketConnection {
  id: string;
  userId: string;
  userType: 'merchant' | 'admin' | 'system';
  rooms: string[];
  channels: EventStreamChannel[];
  connectedAt: Date;
  lastActivity: Date;
  metadata?: Record<string, any>;
}

export interface EventStreamFilter {
  eventTypes?: EventStreamType[];
  channels?: EventStreamChannel[];
  recipientIds?: string[];
  sourceTypes?: EventStreamSourceType[];
  priority?: EventStreamPriority;
  status?: EventStreamStatus;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface EventStreamStats {
  totalEvents: number;
  sentEvents: number;
  failedEvents: number;
  pendingEvents: number;
  avgDeliveryTimeMs: number;
  byEventType: {
    [eventType: string]: {
      count: number;
      successRate: number;
      avgDeliveryTimeMs: number;
    };
  };
  byChannel: {
    [channel: string]: {
      count: number;
      activeConnections: number;
      deliveryRate: number;
    };
  };
}

// Legacy compatibility exports
export const EventStatus = EventStreamStatus;
export const EventPriority = EventStreamPriority;
export const EventSourceType = EventStreamSourceType;

export interface ChannelEventStats {
  created: number;
  sent: number;
  failed: number;
  successRate: number;
}

export interface EventTypeStats {
  created: number;
  sent: number;
  failed: number;
  successRate: number;
  avgPayloadSize: number;
}

export interface WebSocketSubscription {
  userId: string;
  channels: string[];
  eventTypes?: string[];
  room?: string;
  connectedAt: Date;
}
/**
 * Notification Types and Enums
 */

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  TELEGRAM = 'telegram',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  BOUNCED = 'bounced',
  CANCELLED = 'cancelled',
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum NotificationSourceType {
  TRANSACTION = 'transaction',
  WEBHOOK = 'webhook',
  MANUAL = 'manual',
  SYSTEM = 'system',
}

export interface NotificationPayload {
  channel: NotificationChannel;
  type: string;
  recipientId?: string;
  recipientContact: string;
  subject: string;
  message: string;
  templateId?: string;
  templateVariables?: any;
  priority?: NotificationPriority;
  scheduledAt?: Date;
  sourceId?: string;
  sourceType?: NotificationSourceType;
  metadata?: any;
}

export interface NotificationDeliveryResult {
  success: boolean;
  notificationId?: string;
  externalMessageId?: string;
  errorMessage?: string;
  cost?: number;
  deliveryTimeMs?: number;
}

export interface NotificationStats {
  totalSent: number;
  delivered: number;
  failed: number;
  bounced: number;
  pending: number;
  deliveryRate: number;
  avgDeliveryTimeMinutes: number;
  totalCost: number;
  byChannel: Record<NotificationChannel, ChannelStats>;
}

export interface ChannelStats {
  sent: number;
  delivered: number;
  failed: number;
  deliveryRate: number;
  totalCost: number;
  avgDeliveryTimeMinutes: number;
}

/**
 * gRPC Service Types
 */

export interface GrpcResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errorCode?: string;
}

export interface WebhookEventGrpcRequest {
  tsp: string;
  eventType: string;
  tspEventId?: string;
  merchantId?: string;
  transactionId?: string;
  payload: string; // JSON string
  signature?: string;
  sourceIp?: string;
}

export interface NotificationGrpcRequest {
  channel: string;
  type: string;
  recipientId?: string;
  recipientContact: string;
  subject: string;
  message: string;
  templateId?: string;
  templateVariables?: string; // JSON string
  priority?: string;
  scheduledAt?: string;
}

export interface TemplateRenderGrpcRequest {
  templateId: string;
  variables: string; // JSON string
}

export interface EventBroadcastGrpcRequest {
  eventType: string;
  channel: string;
  recipientId?: string;
  room?: string;
  payload: string; // JSON string
  priority?: string;
}

export interface AlertGrpcRequest {
  alertType: string;
  severity: string;
  title: string;
  description: string;
  merchantId?: string;
  source?: string;
  sourceId?: string;
  payload: string; // JSON string
}

export interface HealthCheckGrpcRequest {
  service: string;
}

export interface HealthCheckGrpcResponse {
  healthy: boolean;
  status: string;
  version: string;
  uptime: string;
  checks: Record<string, string>;
}

// Webhook Processing gRPC Types
export interface ProcessWebhookEventRequest {
  tsp: string;
  eventType: string;
  tspEventId?: string;
  merchantId?: string;
  transactionId?: string;
  payload: string;
  signature?: string;
  sourceIp?: string;
}

export interface ProcessWebhookEventResponse {
  success: boolean;
  message: string;
  webhookEventId: string;
  errorCode?: string;
}

export interface CreateWebhookDeliveryRequest {
  merchantId: string;
  eventType: string;
  transactionId?: string;
  paymentId?: string;
  payload: string;
  webhookUrl?: string;
}

export interface CreateWebhookDeliveryResponse {
  success: boolean;
  message: string;
  deliveryId: string;
}

export interface GetWebhookStatusRequest {
  deliveryId: string;
  webhookEventId: string;
}

export interface GetWebhookStatusResponse {
  success: boolean;
  status: string;
  deliveryAttempts: number;
  attempts: number;
  lastAttemptAt?: string;
  nextAttemptAt?: string;
  errorMessage?: string;
  lastError?: string;
}

// Notification gRPC Types
export interface SendNotificationRequest {
  channel: string;
  type: string;
  recipientId?: string;
  recipientContact: string;
  subject: string;
  message: string;
  templateId?: string;
  templateVariables?: string;
  priority?: string;
  scheduledAt?: string;
}

export interface SendNotificationResponse {
  success: boolean;
  message: string;
  notificationId: string;
  externalMessageId: string;
  errorCode?: string;
}

export interface SendBulkNotificationsRequest {
  notifications: SendNotificationRequest[];
}

export interface SendBulkNotificationsResponse {
  success: boolean;
  message: string;
  totalRequested: number;
  totalSuccessful: number;
  totalFailed: number;
  failedCount: number;
  notificationIds: string[];
  results: Array<{
    notificationId?: string;
    success: boolean;
    errorMessage?: string;
  }>;
}

export interface GetNotificationStatusRequest {
  notificationId: string;
}

export interface GetNotificationStatusResponse {
  success: boolean;
  status: string;
  sentAt?: string;
  deliveredAt?: string;
  errorMessage?: string;
  cost?: number;
}

// Template gRPC Types
export interface RenderTemplateRequest {
  templateId: string;
  variables: string;
}

export interface RenderTemplateResponse {
  success: boolean;
  renderedContent: string;
  subject?: string;
  errorMessage?: string;
}

export interface GetTemplateRequest {
  templateId: string;
}

export interface GetTemplateResponse {
  success: boolean;
  templateId?: string;
  template?: {
    id: string;
    name: string;
    content: string;
    type: string;
  };
  errorMessage?: string;
}

// Event Streaming gRPC Types
export interface BroadcastEventRequest {
  eventType: string;
  channel: string;
  recipientId?: string;
  room?: string;
  payload: string;
  priority?: string;
}

export interface BroadcastEventResponse {
  success: boolean;
  message: string;
  eventId: string;
  broadcastCount: number;
  subscribersCount: number;
}

export interface SubscribeToEventsRequest {
  channels: string[];
  recipientId?: string;
  eventTypes?: string[];
  userId?: string;
  room?: string;
}

export interface EventStreamResponse {
  eventId: string;
  eventType: string;
  channel: string;
  payload: string;
  timestamp: string;
}

// Alert gRPC Types
export interface CreateAlertRequest {
  alertType: string;
  severity: string;
  title: string;
  description: string;
  merchantId?: string;
  source?: string;
  sourceId?: string;
  payload: string;
}

export interface CreateAlertResponse {
  success: boolean;
  message: string;
  alertId: string;
}

export interface GetAlertsRequest {
  merchantId?: string;
  severity?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface GetAlertsResponse {
  success: boolean;
  alerts: Array<{
    alertId: string;
    alertType: string;
    severity: string;
    title: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  }>;
  total: number;
  totalCount: number;
}

// Health Check gRPC Types
export interface HealthCheckRequest {
  service: string;
}

export interface HealthCheckResponse {
  healthy: boolean;
  status: string;
  version: string;
  uptime: string;
  checks: Record<string, string>;
}

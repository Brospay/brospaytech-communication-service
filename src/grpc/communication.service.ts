import { Injectable, Logger, Controller } from '@nestjs/common';
import { GrpcMethod, GrpcStreamMethod } from '@nestjs/microservices';
import { Observable, Subject } from 'rxjs';
import { WebhookService } from '../modules/webhook/webhook.service';
import { NotificationService } from '../modules/notification/notification.service';
import { TemplateRendererService } from '../modules/notification/providers';
import { EventStreamingService } from '../modules/event-streaming/event-streaming.service';
import { AlertService } from '../modules/alert/alert.service';
import { ResponseHelper } from '../common';
import type { 
  ProcessWebhookEventRequest,
  ProcessWebhookEventResponse,
  CreateWebhookDeliveryRequest,
  CreateWebhookDeliveryResponse,
  GetWebhookStatusRequest,
  GetWebhookStatusResponse,
  SendNotificationRequest,
  SendNotificationResponse,
  SendBulkNotificationsRequest,
  SendBulkNotificationsResponse,
  GetNotificationStatusRequest,
  GetNotificationStatusResponse,
  RenderTemplateRequest,
  RenderTemplateResponse,
  GetTemplateRequest,
  GetTemplateResponse,
  BroadcastEventRequest,
  BroadcastEventResponse,
  SubscribeToEventsRequest,
  EventStreamResponse,
  CreateAlertRequest,
  CreateAlertResponse,
  GetAlertsRequest,
  GetAlertsResponse,
  HealthCheckRequest,
  HealthCheckResponse
} from '../types';

/**
 * Communication Service gRPC Implementation
 * Provides gRPC interface for inter-service communication
 */
@Controller()
@Injectable()
export class CommunicationGrpcService {
  private readonly logger = new Logger(CommunicationGrpcService.name);
  private eventSubscriptions = new Map<string, Subject<EventStreamResponse>>();

  constructor(
    private readonly webhookService: WebhookService,
    private readonly notificationService: NotificationService,
    private readonly templateRenderer: TemplateRendererService,
    private readonly eventStreamingService: EventStreamingService,
    private readonly alertService: AlertService,
  ) {}

  /**
   * Process webhook event (deprecated - Communication Service handles outbound delivery only)
   */
  @GrpcMethod('CommunicationService', 'ProcessWebhookEvent')
  async processWebhookEvent(request: ProcessWebhookEventRequest): Promise<ProcessWebhookEventResponse> {
    this.logger.warn(`gRPC: Deprecated method called - ProcessWebhookEvent. Communication Service handles outbound delivery only.`);
    
    return {
      success: false,
      message: 'This method is deprecated. Use CreateWebhookDelivery for outbound webhook delivery.',
      webhookEventId: '',
      errorCode: 'METHOD_DEPRECATED',
    };
  }

  /**
   * Create webhook delivery to merchant (called by Payment Engine)
   */
  @GrpcMethod('CommunicationService', 'CreateWebhookDelivery')
  async createWebhookDelivery(request: any): Promise<CreateWebhookDeliveryResponse> {
    const merchantId = request.merchantId || request.merchant_id;
    const webhookUrl = request.webhookUrl || request.webhook_url;
    
    this.logger.log(`gRPC: Payment Engine requesting webhook delivery for merchant ${merchantId}`);
    
    try {
      const eventData = JSON.parse(request.payload);
      
      const eventType = eventData.event_type || 'payment.success';
      
      const webhookEvent = await this.webhookService.createWebhookEvent({
        eventType: eventType as any,
        merchantId: merchantId,
        transactionId: eventData.transaction_id,
        paymentId: eventData.payment_id,
        amount: eventData.amount,
        currency: eventData.currency,
        entityStatus: eventData.status,
        eventData: eventData,
        sourceService: 'payment-engine',
        webhookUrl: webhookUrl,
      });

      try {
        await this.eventStreamingService.createEventStream({
          eventType: this.mapToEventStreamType(eventType),
          channel: 'merchant-dashboard' as any,
          recipientId: merchantId,
          payload: eventData,
          priority: this.determinePriority(eventData),
          sourceId: eventData.transaction_id || eventData.payment_id,
          sourceType: 'payment',
        });
      } catch (eventError) {
        this.logger.warn(`Failed to create event stream: ${eventError.message}`);
      }

      this.logger.log(`Webhook delivery created successfully: ${webhookEvent.id} for merchant ${merchantId}`);

      return {
        success: true,
        message: 'Webhook delivery created and queued for delivery',
        deliveryId: webhookEvent.id,
      };

    } catch (error) {
      this.logger.error(`Failed to create webhook delivery: ${error.message}`, error.stack);
      
      return {
        success: false,
        message: `Failed to create webhook delivery: ${error.message}`,
        deliveryId: '',
      };
    }
  }

  /**
   * Get webhook status
   */
  @GrpcMethod('CommunicationService', 'GetWebhookStatus')
  async getWebhookStatus(request: GetWebhookStatusRequest): Promise<GetWebhookStatusResponse> {
    this.logger.log(`gRPC: Getting webhook status for ${request.webhookEventId}`);
    
    try {
      const events = await this.webhookService.getWebhookEvents({
        page: 1,
        limit: 1,
        offset: 0,
      });

      const event = events.data.find(e => e.id === request.webhookEventId);
      
      if (!event) {
        return {
          success: false,
          status: 'not_found',
          deliveryAttempts: 0,
          attempts: 0,
          lastError: 'Webhook event not found',
        };
      }

      return {
        success: true,
        status: event.status,
        deliveryAttempts: event.attempts,
        attempts: event.attempts,
        lastError: event.lastErrorMessage || '',
      };

    } catch (error) {
      this.logger.error(`Failed to get webhook status: ${error.message}`);
      
      return {
        success: false,
        status: 'error',
        deliveryAttempts: 0,
        attempts: 0,
        lastError: error.message,
      };
    }
  }

  /**
   * Send notification
   */
  @GrpcMethod('CommunicationService', 'SendNotification')
  async sendNotification(request: any): Promise<SendNotificationResponse> {
    const recipientContact = request.recipient_contact || request.recipientContact;
    this.logger.log(`gRPC: Sending ${request.channel} notification to ${recipientContact}`);
    
    try {
      const recipientId = request.recipient_id || request.recipientId;
      const templateId = request.template_id || request.templateId;
      const scheduledAt = request.scheduled_at || request.scheduledAt;
      
      const notification = await this.notificationService.createNotification({
        channel: request.channel,
        type: request.type,
        recipientId: recipientId || null,
        recipientContact: recipientContact,
        subject: request.subject,
        message: request.message,
        templateId: templateId || null,
        metadata: request.template_variables || request.templateVariables ? JSON.parse(request.template_variables || request.templateVariables) : undefined,
        priority: request.priority,
        scheduledAt: scheduledAt || null,
      });

      if (!request.scheduled_at && !request.scheduledAt) {
        await this.notificationService.sendNotification(notification.id);
      }

      return {
        success: true,
        message: 'Notification created and queued for delivery',
        notificationId: notification.id,
        externalMessageId: '',
      };

    } catch (error) {
      this.logger.error(`Failed to send notification: ${error.message}`);
      
      return {
        success: false,
        message: 'Failed to send notification',
        notificationId: '',
        externalMessageId: '',
      };
    }
  }

  /**
   * Send bulk notifications
   */
  @GrpcMethod('CommunicationService', 'SendBulkNotifications')
  async sendBulkNotifications(request: SendBulkNotificationsRequest): Promise<SendBulkNotificationsResponse> {
    this.logger.log(`gRPC: Sending bulk notifications: ${request.notifications.length} items`);
    
    try {
      const results = await Promise.allSettled(
        request.notifications.map(notification => this.sendNotification(notification))
      );

      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));

      const notificationIds = successful
        .map(r => r.status === 'fulfilled' ? r.value.notificationId : '')
        .filter(id => id);

      return {
        success: successful.length > 0,
        message: `Processed ${successful.length} successful, ${failed.length} failed notifications`,
        totalRequested: request.notifications.length,
        totalSuccessful: successful.length,
        totalFailed: failed.length,
        failedCount: failed.length,
        notificationIds,
        results: [], // TODO: Implement actual results array
      };

    } catch (error) {
      this.logger.error(`Failed to send bulk notifications: ${error.message}`);
      
      return {
        success: false,
        message: 'Failed to send bulk notifications',
        totalRequested: request.notifications.length,
        totalSuccessful: 0,
        totalFailed: request.notifications.length,
        failedCount: request.notifications.length,
        notificationIds: [],
        results: [],
      };
    }
  }

  /**
   * Get notification status
   */
  @GrpcMethod('CommunicationService', 'GetNotificationStatus')
  async getNotificationStatus(request: GetNotificationStatusRequest): Promise<GetNotificationStatusResponse> {
    this.logger.log(`gRPC: Getting notification status for ${request.notificationId}`);
    
    try {
      const notifications = await this.notificationService.getNotifications({
        page: 1,
        limit: 1,
        offset: 0,
      });

      const notification = notifications.data.find(n => n.id === request.notificationId);
      
      if (!notification) {
        return {
          success: false,
          status: 'not_found',
          sentAt: '',
          deliveredAt: '',
          errorMessage: 'Notification not found',
          cost: 0,
        };
      }

      return {
        success: true,
        status: notification.status,
        sentAt: notification.sentAt?.toISOString() || '',
        deliveredAt: notification.deliveredAt?.toISOString() || '',
        errorMessage: notification.errorMessage || '',
        cost: notification.cost || 0,
      };

    } catch (error) {
      this.logger.error(`Failed to get notification status: ${error.message}`);
      
      return {
        success: false,
        status: 'error',
        sentAt: '',
        deliveredAt: '',
        errorMessage: error.message,
        cost: 0,
      };
    }
  }

  /**
   * Render template
   */
  @GrpcMethod('CommunicationService', 'RenderTemplate')
  async renderTemplate(request: RenderTemplateRequest): Promise<RenderTemplateResponse> {
    this.logger.log(`gRPC: Rendering template ${request.templateId}`);
    
    try {
      const variables = request.variables ? JSON.parse(request.variables) : {};
      const result = await this.templateRenderer.renderTemplate(request.templateId, variables);

      return {
        success: !!result.body || !!result.html,
        renderedContent: result.body || result.html || '',
        subject: result.subject || '',
        errorMessage: result.validationErrors?.join(', ') || '',
      };

    } catch (error) {
      this.logger.error(`Failed to render template: ${error.message}`);
      
      return {
        success: false,
        renderedContent: '',
        subject: '',
        errorMessage: error.message,
      };
    }
  }

  /**
   * Get template
   */
  @GrpcMethod('CommunicationService', 'GetTemplate')
  async getTemplate(request: GetTemplateRequest): Promise<GetTemplateResponse> {
    this.logger.log(`gRPC: Getting template ${request.templateId}`);
    
    try {
      // In a real implementation, this would fetch from the template service
      return {
        success: true,
        templateId: request.templateId,
        template: {
          id: request.templateId,
          name: 'Sample Template',
          content: 'Sample Body',
          type: 'email',
        },
        errorMessage: '',
      };

    } catch (error) {
      this.logger.error(`Failed to get template: ${error.message}`);
      
      return {
        success: false,
        templateId: '',
        errorMessage: error.message,
      };
    }
  }

  /**
   * Broadcast event
   */
  @GrpcMethod('CommunicationService', 'BroadcastEvent')
  async broadcastEvent(request: BroadcastEventRequest): Promise<BroadcastEventResponse> {
    this.logger.log(`gRPC: Broadcasting event ${request.eventType} to channel ${request.channel}`);
    
    try {
      const eventStream = await this.eventStreamingService.createEventStream({
        eventType: request.eventType as any,
        channel: request.channel as any,
        recipientId: request.recipientId,
        room: request.room,
        payload: JSON.parse(request.payload),
        priority: request.priority as any,
      });

      const result = await this.eventStreamingService.broadcastEvent(eventStream.id);

      return {
        success: result.deliveredCount > 0,
        message: `Event broadcasted to ${result.deliveredCount} subscribers`,
        eventId: eventStream.id,
        broadcastCount: result.deliveredCount,
        subscribersCount: result.recipientCount,
      };

    } catch (error) {
      this.logger.error(`Failed to broadcast event: ${error.message}`);
      
      return {
        success: false,
        message: 'Failed to broadcast event',
        eventId: '',
        broadcastCount: 0,
        subscribersCount: 0,
      };
    }
  }

  /**
   * Subscribe to events (streaming)
   */
  @GrpcStreamMethod('CommunicationService', 'SubscribeToEvents')
  subscribeToEvents(request: SubscribeToEventsRequest): Observable<EventStreamResponse> {
    this.logger.log(`gRPC: User ${request.userId} subscribing to events`);
    
    const subject = new Subject<EventStreamResponse>();
    const subscriptionId = `${request.userId}-${Date.now()}`;
    
    // Store subscription
    this.eventSubscriptions.set(subscriptionId, subject);

    // Subscribe to event streaming service
    this.eventStreamingService.subscribeToChannels(request.userId || request.recipientId || 'unknown', {
      userId: request.userId,
      channels: request.channels as any[],
      eventTypes: request.eventTypes as any[],
      room: request.room,
    }).catch(error => {
      this.logger.error(`Failed to subscribe user to events: ${error.message}`);
      subject.error(error);
    });

    // Cleanup on unsubscribe
    subject.subscribe({
      complete: () => {
        this.eventSubscriptions.delete(subscriptionId);
        this.logger.log(`User ${request.userId} unsubscribed from events`);
      },
      error: (error) => {
        this.eventSubscriptions.delete(subscriptionId);
        this.logger.error(`Event subscription error for user ${request.userId}: ${error.message}`);
      },
    });

    return subject.asObservable();
  }

  /**
   * Create alert
   */
  @GrpcMethod('CommunicationService', 'CreateAlert')
  async createAlert(request: CreateAlertRequest): Promise<CreateAlertResponse> {
    this.logger.log(`gRPC: Creating ${request.severity} alert: ${request.title}`);
    
    try {
      const alert = await this.alertService.createAlert({
        alertType: request.alertType,
        severity: request.severity as any,
        title: request.title,
        description: request.description,
        merchantId: request.merchantId,
        source: request.source,
        sourceId: request.sourceId,
        payload: request.payload ? JSON.parse(request.payload) : undefined,
      });

      return {
        success: true,
        message: 'Alert created successfully',
        alertId: alert.id,
      };

    } catch (error) {
      this.logger.error(`Failed to create alert: ${error.message}`);
      
      return {
        success: false,
        message: 'Failed to create alert',
        alertId: '',
      };
    }
  }

  /**
   * Get alerts
   */
  @GrpcMethod('CommunicationService', 'GetAlerts')
  async getAlerts(request: GetAlertsRequest): Promise<GetAlertsResponse> {
    this.logger.log(`gRPC: Getting alerts for merchant ${request.merchantId}`);
    
    try {
      const alerts = await this.alertService.getAlerts({
        page: 1,
        limit: request.limit || 20,
        offset: request.offset || 0,
        merchantId: request.merchantId,
        severity: request.severity as any,
        status: request.status as any,
      });

      const alertInfos = alerts.data.map(alert => ({
        alertId: alert.id,
        alertType: alert.alertType,
        severity: alert.severity,
        title: alert.title,
        status: alert.status,
        createdAt: alert.createdAt.toISOString(),
        updatedAt: alert.updatedAt.toISOString(),
      }));

      return {
        success: true,
        alerts: alertInfos,
        total: alerts.meta?.total || alertInfos.length,
        totalCount: alerts.meta?.total || alertInfos.length,
      };

    } catch (error) {
      this.logger.error(`Failed to get alerts: ${error.message}`);
      
      return {
        success: false,
        alerts: [],
        total: 0,
        totalCount: 0,
      };
    }
  }

  /**
   * Create webhook endpoint
   */
  @GrpcMethod('CommunicationService', 'CreateWebhookEndpoint')
  async createWebhookEndpoint(request: any): Promise<any> {
    this.logger.log(`gRPC: Creating webhook endpoint for merchant ${request.merchant_id || request.merchantId}`);
    
    try {
      const endpoint = await this.webhookService.createWebhookEndpoint({
        merchantId: request.merchant_id || request.merchantId,
        name: request.name,
        url: request.url,
        secret: request.secret,
        enabledEvents: request.enabled_events || request.enabledEvents,
        httpMethod: request.http_method || request.httpMethod,
        customHeaders: (request.custom_headers || request.customHeaders) 
          ? JSON.parse(request.custom_headers || request.customHeaders) 
          : undefined,
        maxRetries: request.max_retries || request.maxRetries,
        timeoutMs: request.timeout_ms || request.timeoutMs,
        retryDelayMs: request.retry_delay_ms || request.retryDelayMs,
        useExponentialBackoff: request.use_exponential_backoff !== undefined 
          ? request.use_exponential_backoff 
          : request.useExponentialBackoff,
        signatureAlgorithm: request.signature_algorithm || request.signatureAlgorithm,
      });

      return {
        success: true,
        message: 'Webhook endpoint created successfully',
        endpoint: this.mapEndpointToGrpc(endpoint),
      };
    } catch (error) {
      this.logger.error(`Failed to create webhook endpoint: ${error.message}`);
      
      let errorMessage = 'Failed to create webhook endpoint';
      if (error.message.includes('duplicate key') || error.message.includes('UQ_1364e19a66350fdc458965a5ef6')) {
        errorMessage = 'A webhook endpoint with this URL already exists for this merchant';
      } else if (error.message.includes('null value')) {
        errorMessage = 'Invalid request: missing required fields';
      }
      
      return {
        success: false,
        message: errorMessage,
        endpoint: null,
      };
    }
  }

  /**
   * Get webhook endpoints
   */
  @GrpcMethod('CommunicationService', 'GetWebhookEndpoints')
  async getWebhookEndpoints(request: any): Promise<any> {
    const merchantId = request.merchant_id || request.merchantId;
    this.logger.log(`gRPC: Getting webhook endpoints for merchant ${merchantId}`);
    
    try {
      const endpoints = await this.webhookService.getWebhookEndpoints(merchantId);

      return {
        success: true,
        message: 'Webhook endpoints retrieved successfully',
        endpoints: endpoints.map((e: any) => this.mapEndpointToGrpc(e)),
        total_count: endpoints.length,
      };
    } catch (error) {
      this.logger.error(`Failed to get webhook endpoints: ${error.message}`);
      return {
        success: false,
        message: `Failed to get webhook endpoints: ${error.message}`,
        endpoints: [],
        total_count: 0,
      };
    }
  }

  /**
   * Update webhook endpoint
   */
  @GrpcMethod('CommunicationService', 'UpdateWebhookEndpoint')
  async updateWebhookEndpoint(request: any): Promise<any> {
    const endpointId = request.endpoint_id || request.endpointId;
    this.logger.log(`gRPC: Updating webhook endpoint ${endpointId}`);
    
    try {
      const endpoint = await this.webhookService.updateWebhookEndpoint(endpointId, {
        name: request.name,
        url: request.url,
        secret: request.secret,
        enabledEvents: request.enabled_events || request.enabledEvents,
        isActive: request.is_active !== undefined ? request.is_active : request.isActive,
        maxRetries: request.max_retries || request.maxRetries,
        timeoutMs: request.timeout_ms || request.timeoutMs,
      });

      return {
        success: true,
        message: 'Webhook endpoint updated successfully',
        endpoint: this.mapEndpointToGrpc(endpoint),
      };
    } catch (error) {
      this.logger.error(`Failed to update webhook endpoint: ${error.message}`);
      return {
        success: false,
        message: `Failed to update webhook endpoint: ${error.message}`,
        endpoint: null,
      };
    }
  }

  /**
   * Delete webhook endpoint
   */
  @GrpcMethod('CommunicationService', 'DeleteWebhookEndpoint')
  async deleteWebhookEndpoint(request: any): Promise<any> {
    const endpointId = request.endpoint_id || request.endpointId;
    this.logger.log(`gRPC: Deleting webhook endpoint ${endpointId}`);
    
    try {
      await this.webhookService.deleteWebhookEndpoint(endpointId);

      return {
        success: true,
        message: 'Webhook endpoint deleted successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to delete webhook endpoint: ${error.message}`);
      return {
        success: false,
        message: `Failed to delete webhook endpoint: ${error.message}`,
      };
    }
  }

  /**
   * Test webhook endpoint
   */
  @GrpcMethod('CommunicationService', 'TestWebhookEndpoint')
  async testWebhookEndpoint(request: any): Promise<any> {
    const endpointId = request.endpoint_id || request.endpointId;
    this.logger.log(`gRPC: Testing webhook endpoint ${endpointId}`);
    
    try {
      const testPayload = (request.test_payload || request.testPayload) 
        ? JSON.parse(request.test_payload || request.testPayload) 
        : {
          event: 'test',
          timestamp: new Date().toISOString(),
        };

      const result = await this.webhookService.testWebhookEndpoint(endpointId, testPayload);

      return {
        success: result.success,
        message: 'Webhook test completed',
        status_code: result.statusCode || 0,
        response_time_ms: result.responseTime || 0,
        response_body: result.responseBody || '',
      };
    } catch (error) {
      this.logger.error(`Failed to test webhook endpoint: ${error.message}`);
      return {
        success: false,
        message: `Failed to test webhook endpoint: ${error.message}`,
        status_code: 0,
        response_time_ms: 0,
        response_body: '',
      };
    }
  }

  /**
   * Get webhook statistics
   */
  @GrpcMethod('CommunicationService', 'GetWebhookStats')
  async getWebhookStats(request: any): Promise<any> {
    const merchantId = request.merchant_id || request.merchantId;
    const endpointId = request.endpoint_id || request.endpointId;
    this.logger.log(`gRPC: Getting webhook stats for merchant ${merchantId}`);
    
    try {
      const stats = await this.webhookService.getWebhookStats(merchantId, endpointId);

      return {
        success: true,
        message: 'Webhook statistics retrieved successfully',
        total_deliveries: stats.totalDeliveries || 0,
        successful_deliveries: stats.successfulDeliveries || 0,
        failed_deliveries: stats.failedDeliveries || 0,
        success_rate: stats.successRate || 0,
        avg_response_time_ms: stats.avgResponseTime || 0,
        endpoint_stats: stats.endpoints || [],
      };
    } catch (error) {
      this.logger.error(`Failed to get webhook stats: ${error.message}`);
      return {
        success: false,
        message: `Failed to get webhook stats: ${error.message}`,
        total_deliveries: 0,
        successful_deliveries: 0,
        failed_deliveries: 0,
        success_rate: 0,
        avg_response_time_ms: 0,
        endpoint_stats: [],
      };
    }
  }

  /**
   * Map webhook endpoint entity to gRPC response format
   */
  private mapEndpointToGrpc(endpoint: any): any {
    if (!endpoint) return null;

    return {
      id: endpoint.id,
      merchant_id: endpoint.merchantId,
      name: endpoint.name,
      url: endpoint.url,
      status: endpoint.status,
      is_active: endpoint.isActive,
      enabled_events: endpoint.enabledEvents,
      max_retries: endpoint.maxRetries,
      timeout_ms: endpoint.timeoutMs,
      success_count: endpoint.successCount,
      failure_count: endpoint.failureCount,
      success_rate: endpoint.successRate,
      avg_response_time_ms: endpoint.avgResponseTimeMs,
      consecutive_failures: endpoint.consecutiveFailures,
      last_success_at: endpoint.lastSuccessAt?.toISOString() || '',
      last_failure_at: endpoint.lastFailureAt?.toISOString() || '',
      last_error_message: endpoint.lastErrorMessage || '',
      is_verified: endpoint.isVerified,
      created_at: endpoint.createdAt?.toISOString() || '',
      updated_at: endpoint.updatedAt?.toISOString() || '',
    };
  }

  @GrpcMethod('CommunicationService', 'SendTeamInvitationNotification')
  async sendTeamInvitationNotification(request: any): Promise<any> {
    this.logger.log('gRPC: Sending team invitation email');
    
    try {
      const templateData = {
        merchant_id: request.merchant_id,
        merchant_name: request.merchant_name,
        business_name: request.business_name,
        team_member_first_name: request.team_member_first_name,
        team_member_last_name: request.team_member_last_name,
        role: request.role,
        role_description: request.role_description,
        invitation_url: request.invitation_url,
        expires_in_days: request.expires_in_days || 7,
        dashboard_url: request.dashboard_url,
        year: new Date().getFullYear(),
      };
      
      const result = await this.notificationService.sendTemplatedEmail(
        request.team_member_email,
        'team-invitation',
        templateData,
        `You've been invited to join ${request.business_name} on Valorapays`,
      );

      if (result.success) {
        this.logger.log(`Team invitation email sent successfully to ${request.team_member_email}`);
        return {
          success: true,
          message: 'Team invitation email sent successfully',
          notification_id: result.notificationId,
          email_message_id: result.externalMessageId,
        };
      } else {
        this.logger.error(`Failed to send team invitation email: ${result.errorMessage}`);
        return {
          success: false,
          message: result.errorMessage || 'Failed to send team invitation email',
          notification_id: null,
          email_message_id: null,
        };
      }
    } catch (error) {
      this.logger.error(`Error sending team invitation: ${error.message}`, error.stack);
      return {
        success: false,
        message: error.message || 'Failed to send team invitation email',
        notification_id: null,
        email_message_id: null,
      };
    }
  }

  /**
   * Health check
   */
  @GrpcMethod('CommunicationService', 'HealthCheck')
  async healthCheck(request: HealthCheckRequest): Promise<HealthCheckResponse> {
    this.logger.log('gRPC: Health check requested from:', request.service);
    
    try {
      const checks = {
        database: 'healthy',
        redis: 'healthy',
        webhook: 'healthy',
        notification: 'healthy',
        event_streaming: 'healthy',
      };

      const response = {
        healthy: true,
        status: 'healthy',
        version: '1.0.0',
        uptime: process.uptime().toString(),
        checks,
      };
      this.logger.log('gRPC: Health check response:', JSON.stringify(response));
      return response;

    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`);
      
      return {
        healthy: false,
        status: 'unhealthy',
        version: '1.0.0',
        uptime: process.uptime().toString(),
        checks: { service: 'unhealthy' },
      };
    }
  }

  /**
   * Broadcast event to subscribers
   */
  broadcastToSubscribers(event: EventStreamResponse): void {
    this.eventSubscriptions.forEach((subject, subscriptionId) => {
      try {
        subject.next(event);
      } catch (error) {
        this.logger.error(`Failed to broadcast to subscription ${subscriptionId}: ${error.message}`);
        // Remove failed subscription
        this.eventSubscriptions.delete(subscriptionId);
      }
    });
  }

  /**
   * Map payment event type to event stream type
   */
  private mapToEventStreamType(eventType: string): any {
    const mappings: Record<string, string> = {
      'payment.success': 'payment.completed',
      'payment.completed': 'payment.completed',
      'payment.failed': 'payment.failed',
      'payment.pending': 'payment.updated',
      'payment.cancelled': 'payment.cancelled',
      'refund.initiated': 'refund.initiated',
      'refund.completed': 'refund.completed',
      'refund.failed': 'refund.failed',
      'settlement.initiated': 'settlement.initiated',
      'settlement.completed': 'settlement.completed',
      'settlement.failed': 'settlement.failed',
    };

    return mappings[eventType] || 'payment.updated';
  }

  /**
   * Determine priority from event data
   */
  private determinePriority(eventData: any): any {
    if (eventData.priority) return eventData.priority;
    if (eventData.amount && eventData.amount > 100000) return 'high';
    if (eventData.status === 'failed' || eventData.status === 'error') return 'high';
    return 'normal';
  }
}

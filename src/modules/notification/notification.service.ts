import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Notification, NotificationTemplate } from '../../entities';
import { CreateNotificationDto, NotificationFilterDto, BulkCreateNotificationDto } from '../../dto';
import { PaginatedResponseDto } from '../../dto/common';
import { RedisConfigService } from '../../config';
import { NotificationChannel, NotificationStatus, NotificationPriority, NotificationDeliveryResult } from '../../types';
import { 
  EmailNotificationService, 
  SmsNotificationService, 
  TelegramNotificationService, 
  PushNotificationService,
  TemplateRendererService 
} from './providers';

/**
 * Notification Service
 * Handles multi-channel notification delivery (email, SMS, push, Telegram)
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationTemplate)
    private readonly templateRepository: Repository<NotificationTemplate>,
    private readonly redisService: RedisConfigService,
    private readonly emailService: EmailNotificationService,
    private readonly smsService: SmsNotificationService,
    private readonly telegramService: TelegramNotificationService,
    private readonly pushService: PushNotificationService,
    private readonly templateRenderer: TemplateRendererService,
  ) {}

  /**
   * Create a new notification
   */
  async createNotification(createDto: CreateNotificationDto): Promise<Notification> {
    this.logger.log(`Creating ${createDto.channel} notification for: ${createDto.recipientContact}`);
    
    try {
      // Validate channel
      if (!Object.values(NotificationChannel).includes(createDto.channel as NotificationChannel)) {
        throw new BadRequestException(`Unsupported notification channel: ${createDto.channel}`);
      }

      // Validate contact format based on channel
      this.validateRecipientContact(createDto.channel, createDto.recipientContact);

      let subject = createDto.subject;
      let message = createDto.message;
      let htmlContent: string | undefined;

      // Apply template if templateId provided
      if (createDto.templateId) {
        const renderResult = await this.templateRenderer.renderTemplate(
          createDto.templateId,
          createDto.data || {}
        );
        
        subject = renderResult.subject || subject;
        message = renderResult.body;
        htmlContent = renderResult.html;

        if (renderResult.missingVariables && renderResult.missingVariables.length > 0) {
          this.logger.warn(`Missing template variables: ${renderResult.missingVariables.join(', ')}`);
        }
      }

      // Create notification record
      const notification = this.notificationRepository.create({
        channel: createDto.channel,
        type: createDto.type,
        recipientId: createDto.recipientId,
        recipientContact: createDto.recipientContact,
        subject,
        message,
        data: {
          ...createDto.data,
          htmlContent,
        },
        status: NotificationStatus.PENDING,
        priority: createDto.priority || NotificationPriority.NORMAL,
        scheduledAt: createDto.scheduledAt ? new Date(createDto.scheduledAt) : new Date(),
        sourceId: createDto.sourceId,
        sourceType: createDto.sourceType,
        templateId: createDto.templateId,
        metadata: createDto.metadata,
        attempts: 0,
        maxAttempts: 3,
      });

      const savedNotification = await this.notificationRepository.save(notification);

      // Queue for immediate delivery if not scheduled for future
      if (!createDto.scheduledAt || new Date(createDto.scheduledAt) <= new Date()) {
        await this.queueNotificationForDelivery(savedNotification.id);
      }

      this.logger.log(`Notification created successfully: ${savedNotification.id}`);
      return savedNotification;

    } catch (error) {
      this.logger.error(`Failed to create notification: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create bulk notifications
   */
  async createBulkNotifications(bulkDto: BulkCreateNotificationDto): Promise<Notification[]> {
    this.logger.log(`Creating bulk notifications: ${bulkDto.notifications.length} items`);
    
    // TODO: Implement bulk notification creation
    // - Validate all notifications
    // - Process in batches if batchMode enabled
    // - Apply rate limiting per channel
    // - Queue all for delivery
    
    throw new Error('Method not implemented');
  }

  /**
   * Get notifications with filtering and pagination
   */
  async getNotifications(filters: NotificationFilterDto): Promise<PaginatedResponseDto<Notification>> {
    this.logger.log('Fetching notifications with filters');
    
    // TODO: Implement notification querying
    // - Build query with filters
    // - Apply pagination
    // - Include delivery status
    // - Return paginated results
    
    throw new Error('Method not implemented');
  }

  /**
   * Get notification by ID
   */
  async getNotificationById(id: string): Promise<Notification> {
    this.logger.log(`Fetching notification by ID: ${id}`);
    
    // TODO: Implement notification retrieval
    // - Find notification by ID
    // - Include template data
    // - Handle not found case
    
    throw new Error('Method not implemented');
  }

  /**
   * Send notification immediately
   */
  async sendNotification(notificationId: string): Promise<void> {
    this.logger.log(`Sending notification: ${notificationId}`);
    
    try {
      const notification = await this.notificationRepository.findOne({
        where: { id: notificationId },
      });

      if (!notification) {
        throw new NotFoundException(`Notification not found: ${notificationId}`);
      }

      // Check if already sent or failed permanently
      if ([NotificationStatus.SENT, NotificationStatus.DELIVERED].includes(notification.status as NotificationStatus)) {
        this.logger.warn(`Notification ${notificationId} already processed`);
        return;
      }

      // Route to appropriate channel service
      let deliveryResult: NotificationDeliveryResult;

      switch (notification.channel) {
        case NotificationChannel.EMAIL:
          deliveryResult = await this.emailService.sendEmail(notification);
          break;
        case NotificationChannel.SMS:
          deliveryResult = await this.smsService.sendSms(notification);
          break;
        case NotificationChannel.TELEGRAM:
          deliveryResult = await this.telegramService.sendTelegram(notification);
          break;
        case NotificationChannel.PUSH:
          deliveryResult = await this.pushService.sendPush(notification);
          break;
        default:
          throw new BadRequestException(`Unsupported notification channel: ${notification.channel}`);
      }

      // Update notification status based on delivery result
      await this.updateNotificationStatus(notification, deliveryResult);

      this.logger.log(`Notification ${notificationId} processing completed: ${deliveryResult.success ? 'SUCCESS' : 'FAILED'}`);

    } catch (error) {
      this.logger.error(`Failed to send notification ${notificationId}: ${error.message}`, error.stack);
      
      // Update notification as failed
      await this.notificationRepository.update(notificationId, {
        status: NotificationStatus.FAILED,
        errorMessage: error.message,
        attempts: () => 'attempts + 1',
        updatedAt: new Date(),
      });
      
      throw error;
    }
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(notification: Notification): Promise<void> {
    this.logger.log(`Sending email to: ${notification.recipientContact}`);
    
    // TODO: Implement email sending
    // - Use AWS SES or configured email provider
    // - Render HTML template if available
    // - Track delivery status
    // - Handle bounces and complaints
    
    throw new Error('Method not implemented');
  }

  /**
   * Send SMS notification
   */
  async sendSmsNotification(notification: Notification): Promise<void> {
    this.logger.log(`Sending SMS to: ${notification.recipientContact}`);
    
    // TODO: Implement SMS sending
    // - Use Twilio or configured SMS provider
    // - Validate phone number format
    // - Track delivery status
    // - Calculate and track cost
    
    throw new Error('Method not implemented');
  }

  /**
   * Send push notification
   */
  async sendPushNotification(notification: Notification): Promise<void> {
    this.logger.log(`Sending push notification to device: ${notification.recipientContact}`);
    
    // TODO: Implement push notification sending
    // - Use Firebase FCM
    // - Validate device token
    // - Handle platform-specific formatting
    // - Track delivery status
    
    throw new Error('Method not implemented');
  }

  /**
   * Send Telegram notification
   */
  async sendTelegramNotification(notification: Notification): Promise<void> {
    this.logger.log(`Sending Telegram message to chat_id: ${notification.recipientContact}`);
    
    // TODO: Implement Telegram sending
    // - Use Telegram Bot API
    // - Validate chat_id format
    // - Support text, markdown, and HTML formatting
    // - Handle inline keyboards for interactive messages
    // - Track delivery status
    // - Handle bot blocking and chat restrictions
    
    throw new Error('Method not implemented');
  }

  /**
   * Retry failed notification
   */
  async retryNotification(notificationId: string, forceRetry: boolean = false): Promise<void> {
    this.logger.log(`Retrying notification: ${notificationId}`);
    
    // TODO: Implement notification retry
    // - Check retry limits
    // - Calculate next retry time with exponential backoff
    // - Update notification record
    // - Queue for retry
    
    throw new Error('Method not implemented');
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(recipientId?: string): Promise<any> {
    this.logger.log('Fetching notification statistics');
    
    // TODO: Implement notification statistics
    // - Calculate delivery rates by channel
    // - Get cost analytics
    // - Calculate average delivery times
    // - Group by recipient and type
    
    throw new Error('Method not implemented');
  }

  /**
   * Update notification delivery status
   */
  async updateDeliveryStatus(
    notificationId: string, 
    status: string, 
    externalMessageId?: string,
    errorMessage?: string
  ): Promise<void> {
    this.logger.log(`Updating notification ${notificationId} status to: ${status}`);
    
    // TODO: Implement status update
    // - Update notification record
    // - Track delivery timestamps
    // - Update cost if applicable
    // - Trigger webhooks if configured
    
    throw new Error('Method not implemented');
  }

  /**
   * Handle delivery confirmations and webhooks from providers
   */
  async handleDeliveryConfirmation(
    externalMessageId: string,
    status: string,
    providerData: any
  ): Promise<void> {
    this.logger.log(`Handling delivery confirmation for message: ${externalMessageId}`);
    
    try {
      const notification = await this.notificationRepository.findOne({
        where: { externalMessageId },
      });

      if (!notification) {
        this.logger.warn(`Notification not found for external message ID: ${externalMessageId}`);
        return;
      }

      const updateData: Partial<Notification> = {
        updatedAt: new Date(),
      };

      // Map provider status to internal status
      switch (status.toLowerCase()) {
        case 'delivered':
        case 'read':
          updateData.status = NotificationStatus.DELIVERED;
          updateData.deliveredAt = new Date();
          break;
        case 'failed':
        case 'undelivered':
        case 'bounced':
          updateData.status = NotificationStatus.FAILED;
          updateData.errorMessage = providerData?.error || 'Delivery failed';
          break;
        case 'sent':
          updateData.status = NotificationStatus.SENT;
          updateData.sentAt = new Date();
          break;
      }

      // Parse additional provider data
      if (providerData?.cost) {
        updateData.cost = parseFloat(providerData.cost);
      }

      if (providerData?.readAt) {
        updateData.readAt = new Date(providerData.readAt);
      }

      await this.notificationRepository.update(notification.id, updateData);
      this.logger.log(`Updated notification ${notification.id} status to ${updateData.status}`);

    } catch (error) {
      this.logger.error(`Failed to handle delivery confirmation: ${error.message}`);
    }
  }

  /**
   * Send templated email directly (used by gRPC handlers for team invitations, etc.)
   */
  async sendTemplatedEmail(
    to: string,
    templateName: string,
    templateData: Record<string, any>,
    subject?: string,
  ): Promise<NotificationDeliveryResult> {
    this.logger.log(`Sending templated email (${templateName}) to ${to}`);
    
    try {
      return await this.emailService.sendTemplatedEmail(to, templateName, templateData, subject);
    } catch (error) {
      this.logger.error(`Failed to send templated email: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Validate recipient contact format based on channel
   */
  private validateRecipientContact(channel: string, contact: string): void {
    switch (channel) {
      case NotificationChannel.EMAIL:
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) {
          throw new BadRequestException('Invalid email address format');
        }
        break;
      case NotificationChannel.SMS:
        if (!/^\+?[\d\s-()]{10,15}$/.test(contact)) {
          throw new BadRequestException('Invalid phone number format');
        }
        break;
      case NotificationChannel.TELEGRAM:
        if (!/^-?\d+$/.test(contact)) {
          throw new BadRequestException('Invalid Telegram chat_id format');
        }
        break;
      case NotificationChannel.PUSH:
        if (!/^[A-Za-z0-9_-]{140,}$/.test(contact)) {
          throw new BadRequestException('Invalid device token format');
        }
        break;
    }
  }

  /**
   * Queue notification for delivery
   */
  private async queueNotificationForDelivery(notificationId: string): Promise<void> {
    try {
      const queueKey = 'notification:delivery:queue';
      const jobData = {
        notificationId,
        queuedAt: new Date().toISOString(),
        priority: 'normal',
      };

      await this.redisService.getClient().lpush(queueKey, JSON.stringify(jobData));
      this.logger.debug(`Notification queued for delivery: ${notificationId}`);
    } catch (error) {
      this.logger.error(`Failed to queue notification for delivery: ${error.message}`);
    }
  }

  /**
   * Update notification status based on delivery result
   */
  private async updateNotificationStatus(
    notification: Notification,
    deliveryResult: NotificationDeliveryResult
  ): Promise<void> {
    try {
      const updateData: Partial<Notification> = {
        attempts: notification.attempts + 1,
        updatedAt: new Date(),
      };

      if (deliveryResult.success) {
        updateData.status = NotificationStatus.SENT;
        updateData.sentAt = new Date();
        updateData.externalMessageId = deliveryResult.externalMessageId;
        
        if (deliveryResult.cost !== undefined) {
          updateData.cost = deliveryResult.cost;
        }
      } else {
        updateData.status = NotificationStatus.FAILED;
        updateData.errorMessage = deliveryResult.errorMessage;

        // Schedule retry if under max attempts
        if (notification.attempts < notification.maxAttempts) {
          updateData.nextRetryAt = this.calculateNextRetryTime(notification.attempts);
          updateData.status = NotificationStatus.PENDING; // Keep as pending for retry
        }
      }

      await this.notificationRepository.update(notification.id, updateData);

    } catch (error) {
      this.logger.error(`Failed to update notification status: ${error.message}`);
    }
  }

  /**
   * Calculate next retry time with exponential backoff
   */
  private calculateNextRetryTime(attempts: number): Date {
    const baseDelayMs = 60000; // 1 minute
    const maxDelayMs = 30 * 60 * 1000; // 30 minutes
    const delayMs = Math.min(baseDelayMs * Math.pow(2, attempts), maxDelayMs);
    
    return new Date(Date.now() + delayMs);
  }
}

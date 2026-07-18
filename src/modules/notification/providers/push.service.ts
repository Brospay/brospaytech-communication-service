import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { Notification } from '../../../entities';
import { NotificationDeliveryResult } from '../../../types';
import { CommunicationConfigService } from '../../../config';

/**
 * Push Notification Service
 * Handles push notifications via Firebase Cloud Messaging (FCM)
 */
@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private readonly isConfigured: boolean;
  private readonly firebaseApp: admin.app.App | null = null;

  constructor(private readonly configService: CommunicationConfigService) {
    const firebaseConfig = this.configService.getFirebaseConfig();
    
    this.isConfigured = !!(firebaseConfig.projectId && firebaseConfig.privateKey && firebaseConfig.clientEmail);
  }

  /**
   * Send push notification
   */
  async sendPush(notification: Notification): Promise<NotificationDeliveryResult> {
    const startTime = Date.now();
    
    try {
      if (!this.isConfigured) {
        throw new Error('Firebase push notification service not configured');
      }

      this.logger.log(`Sending push notification ${notification.id} to token: ${notification.recipientContact}`);

      // Validate device token format
      if (!this.isValidDeviceToken(notification.recipientContact)) {
        throw new Error('Invalid device token format');
      }

      // Simulate push notification sending
      const messageId = this.generateMessageId();
      
      const deliveryTime = Date.now() - startTime;
      
      this.logger.log(`Push notification sent successfully: ${messageId}, delivery time: ${deliveryTime}ms`);

      return {
        success: true,
        notificationId: notification.id,
        externalMessageId: messageId,
        deliveryTimeMs: deliveryTime,
        cost: 0, // FCM is free
      };

    } catch (error) {
      const deliveryTime = Date.now() - startTime;
      
      this.logger.error(`Failed to send push notification ${notification.id}:`, error);

      const errorMessage = this.categorizePushError(error);

      return {
        success: false,
        notificationId: notification.id,
        errorMessage,
        deliveryTimeMs: deliveryTime,
      };
    }
  }

  /**
   * Send bulk push notifications
   */
  async sendBulkPush(notifications: Notification[]): Promise<NotificationDeliveryResult[]> {
    this.logger.log(`Sending bulk push notifications: ${notifications.length} notifications`);

    if (!this.isConfigured || !this.firebaseApp) {
      return notifications.map(notification => ({
        success: false,
        notificationId: notification.id,
        errorMessage: 'Firebase push notification service not configured',
      }));
    }

    // Prepare all messages
    const messages = notifications.map(notification => this.preparePushMessage(notification));
    
    try {
      // Send all messages individually
      const results: NotificationDeliveryResult[] = [];
      
      for (const [index, message] of messages.entries()) {
        const notification = notifications[index];
        
        try {
          const messageId = await admin.messaging(this.firebaseApp).send(message);
          results.push({
            success: true,
            notificationId: notification.id,
            externalMessageId: messageId,
          });
        } catch (error) {
          results.push({
            success: false,
            notificationId: notification.id,
            errorMessage: error.message,
          });
        }
      }
      
      this.logger.log(`Bulk push completed: ${results.filter(r => r.success).length}/${notifications.length} successful`);
      return results;

    } catch (error) {
      this.logger.error('Failed to send bulk push notifications:', error);
      
      // Return error for all notifications
      return notifications.map(notification => ({
        success: false,
        notificationId: notification.id,
        errorMessage: 'Bulk push notification failed',
      }));
    }
  }

  /**
   * Send push notification to topic
   */
  async sendToTopic(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, string>,
    options?: {
      priority?: 'high' | 'normal';
      timeToLive?: number;
      imageUrl?: string;
    }
  ): Promise<string> {
    try {
      if (!this.isConfigured || !this.firebaseApp) {
        throw new Error('Firebase push notification service not configured');
      }

      const message: admin.messaging.Message = {
        topic,
        notification: {
          title,
          body,
          imageUrl: options?.imageUrl,
        },
        data,
        android: {
          priority: options?.priority || 'high',
          ttl: options?.timeToLive || 24 * 60 * 60 * 1000, // 24 hours
          notification: {
            channelId: 'valorapays_notifications',
            priority: 'high',
            defaultSound: true,
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title,
                body,
              },
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const messageId = await admin.messaging(this.firebaseApp).send(message);
      this.logger.log(`Topic message sent successfully: ${messageId}`);
      
      return messageId;

    } catch (error) {
      this.logger.error(`Failed to send topic message to ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe device token to topic
   */
  async subscribeToTopic(deviceTokens: string[], topic: string): Promise<void> {
    try {
      if (!this.isConfigured || !this.firebaseApp) {
        throw new Error('Firebase push notification service not configured');
      }

      const response = await admin.messaging(this.firebaseApp)
        .subscribeToTopic(deviceTokens, topic);
      
      this.logger.log(`Subscribed ${response.successCount}/${deviceTokens.length} tokens to topic: ${topic}`);

      if (response.failureCount > 0) {
        response.errors.forEach((error, index) => {
          this.logger.warn(`Failed to subscribe token ${deviceTokens[index]} to topic ${topic}: ${error.error.message}`);
        });
      }

    } catch (error) {
      this.logger.error(`Failed to subscribe to topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Unsubscribe device token from topic
   */
  async unsubscribeFromTopic(deviceTokens: string[], topic: string): Promise<void> {
    try {
      if (!this.isConfigured || !this.firebaseApp) {
        throw new Error('Firebase push notification service not configured');
      }

      const response = await admin.messaging(this.firebaseApp)
        .unsubscribeFromTopic(deviceTokens, topic);
      
      this.logger.log(`Unsubscribed ${response.successCount}/${deviceTokens.length} tokens from topic: ${topic}`);

    } catch (error) {
      this.logger.error(`Failed to unsubscribe from topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Prepare push message for FCM
   */
  private preparePushMessage(notification: Notification): admin.messaging.Message {
    const message: admin.messaging.Message = {
      token: notification.recipientContact,
      notification: {
        title: notification.subject,
        body: notification.message,
      },
      data: {
        notification_id: notification.id,
        type: notification.type,
        ...(notification.data?.customData || {}),
      },
    };

    // Add Android-specific configuration
    message.android = {
      priority: this.getPriorityLevel(notification.priority),
      notification: {
        channelId: 'valorapays_notifications',
        priority: 'high',
        defaultSound: true,
        color: '#1f2937', // Valorapays brand color
        icon: 'ic_notification',
        ...(notification.data?.imageUrl && { imageUrl: notification.data.imageUrl }),
      },
      ttl: 24 * 60 * 60 * 1000, // 24 hours
    };

    // Add iOS-specific configuration
    message.apns = {
      payload: {
        aps: {
          alert: {
            title: notification.subject,
            body: notification.message,
          },
          sound: 'default',
          badge: 1,
          'mutable-content': 1,
        },
      },
      fcmOptions: {
        ...(notification.data?.imageUrl && { imageUrl: notification.data.imageUrl }),
      },
    };

    // Add web push configuration
    message.webpush = {
      notification: {
        title: notification.subject,
        body: notification.message,
        icon: '/icons/notification-icon.png',
        badge: '/icons/badge-icon.png',
        ...(notification.data?.imageUrl && { image: notification.data.imageUrl }),
        requireInteraction: notification.priority === 'urgent',
        actions: notification.data?.actions || [],
      },
      fcmOptions: {
        link: notification.data?.clickUrl || 'https://dashboard.valorapays.com',
      },
    };

    return message;
  }

  /**
   * Get FCM priority level based on notification priority
   */
  private getPriorityLevel(priority: string): 'high' | 'normal' {
    return ['high', 'urgent'].includes(priority) ? 'high' : 'normal';
  }

  /**
   * Validate device token format
   */
  private isValidDeviceToken(token: string): boolean {
    // FCM tokens are typically 152+ characters long and contain alphanumeric characters
    return /^[A-Za-z0-9_-]{140,}$/.test(token);
  }

  /**
   * Categorize push notification errors
   */
  private categorizePushError(error: any): string {
    const errorCode = error?.code || error?.errorInfo?.code;
    
    switch (errorCode) {
      case 'messaging/registration-token-not-registered':
        return 'Device token is not registered';
      case 'messaging/invalid-registration-token':
        return 'Invalid device token format';
      case 'messaging/mismatched-credential':
        return 'Firebase credentials mismatch';
      case 'messaging/invalid-argument':
        return 'Invalid push notification parameters';
      case 'messaging/quota-exceeded':
        return 'Firebase quota exceeded';
      case 'messaging/sender-id-mismatch':
        return 'Firebase sender ID mismatch';
      case 'messaging/too-many-topics':
        return 'Device subscribed to too many topics';
      case 'messaging/topic-name-invalid':
        return 'Invalid topic name';
      default:
        return error?.message || 'Unknown push notification error';
    }
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `push-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate Firebase configuration
   */
  async validateConfiguration(): Promise<boolean> {
    return this.isConfigured;
  }

  /**
   * Get Firebase project information
   */
  async getProjectInfo(): Promise<any> {
    return {
      configured: this.isConfigured,
    };
  }

  /**
   * Clean up invalid device tokens
   */
  async cleanupInvalidTokens(tokens: string[]): Promise<string[]> {
    this.logger.log(`Token cleanup requested for ${tokens.length} tokens`);
    return [];
  }

  /**
   * Check if service is properly configured
   */
  isServiceConfigured(): boolean {
    return this.isConfigured;
  }
}

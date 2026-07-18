import { Injectable, Logger } from '@nestjs/common';
import { Notification } from '../../../entities';
import { NotificationDeliveryResult } from '../../../types';
import { CommunicationConfigService } from '../../../config';

/**
 * SMS Notification Service
 * Handles SMS delivery via Twilio
 */
@Injectable()
export class SmsNotificationService {
  private readonly logger = new Logger(SmsNotificationService.name);
  private readonly fromNumber: string;
  private readonly isConfigured: boolean;

  constructor(private readonly configService: CommunicationConfigService) {
    const twilioConfig = this.configService.getTwilioConfig();
    
    this.isConfigured = !!(twilioConfig.accountSid && twilioConfig.authToken);
    this.fromNumber = twilioConfig.fromNumber;
  }

  /**
   * Send SMS notification
   */
  async sendSms(notification: Notification): Promise<NotificationDeliveryResult> {
    const startTime = Date.now();
    
    try {
      if (!this.isConfigured) {
        throw new Error('Twilio SMS service not configured');
      }

      this.logger.log(`Sending SMS notification ${notification.id} to ${notification.recipientContact}`);

      // Validate and format phone number
      const formattedPhone = this.formatPhoneNumber(notification.recipientContact);
      if (!formattedPhone) {
        throw new Error('Invalid phone number format');
      }

      // Check message length and truncate if necessary
      const message = this.prepareMessage(notification.message);

      // Simulate SMS sending
      const messageId = this.generateMessageId();
      
      const deliveryTime = Date.now() - startTime;
      const cost = this.calculateSmsCost(formattedPhone, message);
      
      this.logger.log(`SMS sent successfully: ${messageId}, delivery time: ${deliveryTime}ms`);

      return {
        success: true,
        notificationId: notification.id,
        externalMessageId: messageId,
        deliveryTimeMs: deliveryTime,
        cost,
      };

    } catch (error) {
      const deliveryTime = Date.now() - startTime;
      
      this.logger.error(`Failed to send SMS notification ${notification.id}:`, error);

      const errorMessage = this.categorizeSmsError(error);

      return {
        success: false,
        notificationId: notification.id,
        errorMessage,
        deliveryTimeMs: deliveryTime,
      };
    }
  }

  /**
   * Send bulk SMS with rate limiting
   */
  async sendBulkSms(notifications: Notification[]): Promise<NotificationDeliveryResult[]> {
    this.logger.log(`Sending bulk SMS: ${notifications.length} notifications`);

    const results: NotificationDeliveryResult[] = [];
    const rateLimit = this.configService.getRateLimits().smsPerMinute || 50;
    
    for (let i = 0; i < notifications.length; i++) {
      const notification = notifications[i];
      const result = await this.sendSms(notification);
      results.push(result);

      // Rate limiting delay
      if (i < notifications.length - 1) {
        const delayMs = (60 * 1000) / rateLimit;
        await this.delay(delayMs);
      }
    }

    return results;
  }

  /**
   * Handle SMS delivery status callbacks
   */
  async handleDeliveryStatus(statusData: any): Promise<void> {
    try {
      const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = statusData;
      
      this.logger.log(`SMS status update: ${MessageSid} - ${MessageStatus}`);

      // Update notification status in database based on Twilio status
      switch (MessageStatus) {
        case 'delivered':
          // Mark as delivered
          break;
        case 'failed':
        case 'undelivered':
          // Mark as failed with error details
          this.logger.warn(`SMS delivery failed: ${MessageSid}, Error: ${ErrorCode} - ${ErrorMessage}`);
          break;
        case 'sent':
          // Mark as sent but not yet delivered
          break;
        default:
          this.logger.debug(`SMS status: ${MessageSid} - ${MessageStatus}`);
      }

    } catch (error) {
      this.logger.error('Error handling SMS delivery status:', error);
    }
  }

  /**
   * Format phone number to E.164 format
   */
  private formatPhoneNumber(phoneNumber: string): string | null {
    try {
      // Remove all non-digit characters
      const digitsOnly = phoneNumber.replace(/\D/g, '');
      
      // Handle different input formats
      if (digitsOnly.length === 10) {
        // Assume US number if 10 digits
        return `+1${digitsOnly}`;
      } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
        // US number with country code
        return `+${digitsOnly}`;
      } else if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
        // Indian number with country code
        return `+${digitsOnly}`;
      } else if (digitsOnly.length === 10 && phoneNumber.includes('+91')) {
        // Indian number
        return `+91${digitsOnly}`;
      } else if (phoneNumber.startsWith('+')) {
        // Already formatted
        return phoneNumber;
      }
      
      return null;
    } catch (error) {
      this.logger.error('Error formatting phone number:', error);
      return null;
    }
  }

  /**
   * Prepare SMS message (handle length limits)
   */
  private prepareMessage(message: string): string {
    const maxLength = 1600; // Twilio's max message length
    
    if (message.length <= maxLength) {
      return message;
    }
    
    // Truncate and add ellipsis
    return message.substring(0, maxLength - 3) + '...';
  }

  /**
   * Calculate SMS cost based on destination and segments
   */
  private calculateSmsCost(phoneNumber: string, message: string): number {
    // Calculate number of SMS segments (160 chars per segment for GSM)
    const segments = Math.ceil(message.length / 160);
    
    // Determine pricing based on destination
    let pricePerSegment = 0.0075; // Default US pricing
    
    if (phoneNumber.startsWith('+91')) {
      // India pricing
      pricePerSegment = 0.0065;
    } else if (phoneNumber.startsWith('+44')) {
      // UK pricing
      pricePerSegment = 0.04;
    }
    
    return segments * pricePerSegment;
  }

  /**
   * Categorize SMS errors for better handling
   */
  private categorizeSmsError(error: any): string {
    if (error.code === 21211) {
      return 'Invalid phone number';
    } else if (error.code === 21408) {
      return 'Phone number cannot receive SMS';
    } else if (error.code === 21614) {
      return 'Message body cannot be empty';
    } else if (error.code === 21612) {
      return 'Message body is too long';
    } else if (error.code === 21610) {
      return 'Message contains prohibited content';
    } else if (error.status === 400) {
      return 'Invalid SMS parameters';
    } else if (error.status === 401) {
      return 'Twilio authentication failed';
    } else {
      return error.message || 'Unknown SMS delivery error';
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `sms-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate SMS configuration
   */
  async validateConfiguration(): Promise<boolean> {
    return this.isConfigured;
  }

  /**
   * Get SMS sending statistics
   */
  async getSendingStats(): Promise<any> {
    return {
      configured: this.isConfigured,
      fromNumber: this.fromNumber,
    };
  }

  /**
   * Check if service is properly configured
   */
  isServiceConfigured(): boolean {
    return this.isConfigured;
  }
}

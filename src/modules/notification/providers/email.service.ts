import { Injectable, Logger } from '@nestjs/common';
import { SESClient, SendEmailCommand, SendTemplatedEmailCommand } from '@aws-sdk/client-ses';
import * as nodemailer from 'nodemailer';
import { Notification } from '../../../entities';
import { NotificationDeliveryResult } from '../../../types';
import { CommunicationConfigService } from '../../../config';
import { TemplateLoaderService } from './template-loader.service';

/**
 * Email Notification Service
 * Handles email delivery via SMTP (Gmail) or AWS SES
 */
@Injectable()
export class EmailNotificationService {
  private readonly logger = new Logger(EmailNotificationService.name);
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly isConfigured: boolean;
  private readonly sesClient: SESClient | null;
  private readonly smtpTransporter: any;
  private readonly useSmtp: boolean;

  constructor(
    private readonly configService: CommunicationConfigService,
    private readonly templateLoader: TemplateLoaderService,
  ) {
    const emailConfig = this.configService.getEmailConfig();
    
    this.fromEmail = emailConfig.from;
    this.fromName = emailConfig.fromName;

    if (emailConfig.host && emailConfig.port && emailConfig.user && emailConfig.password) {
      this.useSmtp = true;
      this.smtpTransporter = nodemailer.createTransport({
        host: emailConfig.host,
        port: emailConfig.port,
        secure: emailConfig.secure,
        auth: {
          user: emailConfig.user,
          pass: emailConfig.password,
        },
      });
      this.isConfigured = true;
      this.sesClient = null;
      this.logger.log(`Email service initialized with SMTP (${emailConfig.host})`);
    } else {
      this.useSmtp = false;
      const awsConfig = this.configService.getAWSConfig();
      
      this.isConfigured = !!(awsConfig.region && awsConfig.accessKeyId && awsConfig.secretAccessKey);

      if (this.isConfigured) {
        this.sesClient = new SESClient({
          region: awsConfig.region,
          credentials: {
            accessKeyId: awsConfig.accessKeyId,
            secretAccessKey: awsConfig.secretAccessKey,
          },
        });
        this.logger.log('Email service initialized with AWS SES');
      } else {
        this.sesClient = null;
        this.logger.warn('Email service not configured - emails will be simulated');
      }
    }
  }

  /**
   * Send email notification
   */
  async sendEmail(notification: Notification): Promise<NotificationDeliveryResult> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`Sending email notification ${notification.id} to ${notification.recipientContact}`);

      // Validate email address
      if (!this.isValidEmail(notification.recipientContact)) {
        throw new Error('Invalid email address format');
      }

      let messageId: string = this.generateMessageId();

      if (this.isConfigured) {
        if (this.useSmtp) {
          const info = await this.smtpTransporter.sendMail({
            from: `"${this.fromName}" <${this.fromEmail}>`,
            to: notification.recipientContact,
            subject: notification.subject || 'Notification from Valorapays',
            html: notification.message,
            text: notification.message.replace(/<[^>]*>/g, ''),
          });

          messageId = info.messageId;
          this.logger.log(`Email sent via SMTP: ${messageId}`);
        } else if (this.sesClient) {
          const command = new SendEmailCommand({
            Source: this.fromEmail,
            Destination: {
              ToAddresses: [notification.recipientContact],
            },
            Message: {
              Subject: {
                Data: notification.subject || 'Notification from Valorapays',
                Charset: 'UTF-8',
              },
              Body: {
                Html: {
                  Data: notification.message,
                  Charset: 'UTF-8',
                },
                Text: {
                  Data: notification.message.replace(/<[^>]*>/g, ''),
                  Charset: 'UTF-8',
                },
              },
            },
            ConfigurationSetName: this.configService.getAWSConfig().sesConfigSet || undefined,
          });

          const response = await this.sesClient.send(command);
          messageId = response.MessageId || messageId;
          
          this.logger.log(`Email sent via AWS SES: ${messageId}`);
        }
      } else {
        this.logger.log(`Email simulated (not configured): ${messageId}`);
      }
      
      const deliveryTime = Date.now() - startTime;

      return {
        success: true,
        notificationId: notification.id,
        externalMessageId: messageId,
        deliveryTimeMs: deliveryTime,
        cost: this.calculateEmailCost(),
      };

    } catch (error) {
      const deliveryTime = Date.now() - startTime;
      
      this.logger.error(`Failed to send email notification ${notification.id}:`, error);

      return {
        success: false,
        notificationId: notification.id,
        errorMessage: this.categorizeEmailError(error),
        deliveryTimeMs: deliveryTime,
      };
    }
  }

  /**
   * Send templated email (for team invitations, etc.)
   */
  async sendTemplatedEmail(
    to: string,
    templateName: string,
    templateData: Record<string, any>,
    subject?: string,
  ): Promise<NotificationDeliveryResult> {
    const startTime = Date.now();
    const notificationId = `email-${Date.now()}`;
    
    try {
      this.logger.log(`Sending templated email (${templateName}) to ${to}`);

      // Validate email address
      if (!this.isValidEmail(to)) {
        throw new Error('Invalid email address format');
      }

      let messageId: string = this.generateMessageId();
      const htmlContent = await this.renderTemplate(templateName, templateData);

      if (this.isConfigured) {
        if (this.useSmtp) {
          // Send via SMTP (Gmail)
          const info = await this.smtpTransporter.sendMail({
            from: `"${this.fromName}" <${this.fromEmail}>`,
            to: to,
            subject: subject || templateData.subject || 'Notification from Valorapays',
            html: htmlContent,
          });

          messageId = info.messageId;
          this.logger.log(`Templated email sent via SMTP: ${messageId}`);
        } else if (this.sesClient) {
          // Send via AWS SES
          const command = new SendEmailCommand({
            Source: this.fromEmail,
            Destination: {
              ToAddresses: [to],
            },
            Message: {
              Subject: {
                Data: subject || templateData.subject || 'Notification from Valorapays',
                Charset: 'UTF-8',
              },
              Body: {
                Html: {
                  Data: htmlContent,
                  Charset: 'UTF-8',
                },
              },
            },
            ConfigurationSetName: this.configService.getAWSConfig().sesConfigSet || undefined,
          });

          const response = await this.sesClient.send(command);
          messageId = response.MessageId || messageId;
          
          this.logger.log(`Templated email sent via AWS SES: ${messageId}`);
        }
      } else {
        this.logger.log(`Templated email simulated (not configured): ${messageId}`);
      }
      
      const deliveryTime = Date.now() - startTime;

      return {
        success: true,
        notificationId,
        externalMessageId: messageId,
        deliveryTimeMs: deliveryTime,
        cost: this.calculateEmailCost(),
      };

    } catch (error) {
      const deliveryTime = Date.now() - startTime;
      
      this.logger.error(`Failed to send templated email to ${to}:`, error);

      return {
        success: false,
        notificationId,
        errorMessage: this.categorizeEmailError(error),
        deliveryTimeMs: deliveryTime,
      };
    }
  }

  /**
   * Send bulk emails with rate limiting
   */
  async sendBulkEmails(notifications: Notification[]): Promise<NotificationDeliveryResult[]> {
    this.logger.log(`Sending bulk emails: ${notifications.length} notifications`);

    const results: NotificationDeliveryResult[] = [];
    const rateLimit = this.configService.getRateLimits().emailPerMinute || 100;
    const batchSize = Math.min(50, rateLimit); // SES allows 50 emails per batch
    
    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(notification => this.sendEmail(notification))
      );

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            notificationId: batch[index].id,
            errorMessage: result.reason?.message || 'Unknown error in bulk send',
          });
        }
      });

      // Rate limiting delay between batches
      if (i + batchSize < notifications.length) {
        const delayMs = (60 * 1000) / (rateLimit / batchSize);
        await this.delay(delayMs);
      }
    }

    return results;
  }

  /**
   * Handle bounce and complaint notifications
   */
  async handleBounceComplaint(eventType: string, eventData: any): Promise<void> {
    try {
      this.logger.log(`Processing email ${eventType} event`);

      const messageId = eventData.mail?.messageId;
      const bounceType = eventData.bounce?.bounceType || eventData.complaint?.complaintFeedbackType;
      const recipients = eventData.bounce?.bouncedRecipients || eventData.complaint?.complainedRecipients;

      if (recipients) {
        for (const recipient of recipients) {
          const emailAddress = recipient.emailAddress;
          
          // Log the bounce/complaint
          this.logger.warn(`Email ${eventType} for ${emailAddress}: ${bounceType}`);

          // Add to suppression list if hard bounce or complaint
          if (eventType === 'bounce' && eventData.bounce?.bounceType === 'Permanent') {
            await this.addToSuppressionList(emailAddress, 'hard_bounce');
          } else if (eventType === 'complaint') {
            await this.addToSuppressionList(emailAddress, 'complaint');
          }
        }
      }

    } catch (error) {
      this.logger.error('Error handling bounce/complaint:', error);
    }
  }

  /**
   * Check if email is in suppression list
   */
  async isEmailSuppressed(emailAddress: string): Promise<boolean> {
    try {
      // Implementation would check Redis or database for suppressed emails
      // For now, return false
      return false;
    } catch (error) {
      this.logger.error('Error checking email suppression:', error);
      return false;
    }
  }

  /**
   * Validate email address format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Calculate email cost
   */
  private calculateEmailCost(): number {
    // AWS SES pricing: $0.0001 per email for first 62,000 emails
    return 0.0001;
  }

  /**
   * Categorize email errors for better handling
   */
  private categorizeEmailError(error: any): string {
    if (error.code === 'MessageRejected') {
      return 'Email rejected by SES';
    } else if (error.code === 'MailFromDomainNotVerified') {
      return 'Sender domain not verified';
    } else if (error.code === 'ConfigurationSetDoesNotExist') {
      return 'SES configuration set not found';
    } else if (error.code === 'InvalidParameterValue') {
      return 'Invalid email parameters';
    } else {
      return error.message || 'Unknown email delivery error';
    }
  }

  /**
   * Add email to suppression list
   */
  private async addToSuppressionList(emailAddress: string, reason: string): Promise<void> {
    try {
      // Implementation would add email to Redis or database suppression list
      this.logger.log(`Adding ${emailAddress} to suppression list: ${reason}`);
    } catch (error) {
      this.logger.error('Error adding email to suppression list:', error);
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
    return `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Render email template using Handlebars
   */
  private async renderTemplate(templateName: string, data: Record<string, any>): Promise<string> {
    return this.templateLoader.render(templateName, data);
  }

  /**
   * Validate email configuration
   */
  async validateConfiguration(): Promise<boolean> {
    return this.isConfigured;
  }

  /**
   * Get email sending statistics
   */
  async getSendingStats(): Promise<any> {
    return {
      configured: this.isConfigured,
      fromEmail: this.fromEmail,
    };
  }

  /**
   * Check if service is properly configured
   */
  isServiceConfigured(): boolean {
    return this.isConfigured;
  }
}

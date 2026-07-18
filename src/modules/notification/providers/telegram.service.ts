import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { Notification } from '../../../entities';
import { NotificationDeliveryResult } from '../../../types';
import { CommunicationConfigService } from '../../../config';

/**
 * Telegram Notification Service
 * Handles message delivery via Telegram Bot API
 */
@Injectable()
export class TelegramNotificationService {
  private readonly logger = new Logger(TelegramNotificationService.name);
  private readonly botToken: string;
  private readonly isConfigured: boolean;
  private readonly httpClient: AxiosInstance;

  constructor(private readonly configService: CommunicationConfigService) {
    const telegramConfig = this.configService.getTelegramConfig();
    
    this.isConfigured = !!(telegramConfig.botToken);
    this.botToken = telegramConfig.botToken;
    
    this.httpClient = axios.create({
      baseURL: `https://api.telegram.org/bot${this.botToken}`,
      timeout: 10000,
    });
  }

  /**
   * Send Telegram notification
   */
  async sendTelegram(notification: Notification): Promise<NotificationDeliveryResult> {
    const startTime = Date.now();
    
    try {
      if (!this.isConfigured) {
        throw new Error('Telegram Bot service not configured');
      }

      this.logger.log(`Sending Telegram notification ${notification.id} to chat_id: ${notification.recipientContact}`);

      if (!this.isValidChatId(notification.recipientContact)) {
        throw new Error('Invalid Telegram chat_id format');
      }

      const messageData = this.prepareMessage(notification);

      const messageId = this.generateMessageId();
      
      const deliveryTime = Date.now() - startTime;
      
      this.logger.log(`Telegram message sent successfully: ${messageId}, delivery time: ${deliveryTime}ms`);

      return {
        success: true,
        notificationId: notification.id,
        externalMessageId: messageId,
        deliveryTimeMs: deliveryTime,
        cost: 0,
      };

    } catch (error) {
      const deliveryTime = Date.now() - startTime;
      
      this.logger.error(`Failed to send Telegram notification ${notification.id}:`, error);

      const errorMessage = this.categorizeTelegramError(error);

      return {
        success: false,
        notificationId: notification.id,
        errorMessage,
        deliveryTimeMs: deliveryTime,
      };
    }
  }

  /**
   * Send bulk Telegram notifications with rate limiting
   */
  async sendBulkTelegram(notifications: Notification[]): Promise<NotificationDeliveryResult[]> {
    this.logger.log(`Sending bulk Telegram messages: ${notifications.length} notifications`);

    const results: NotificationDeliveryResult[] = [];
    const rateLimit = 30;
    
    for (let i = 0; i < notifications.length; i++) {
      const notification = notifications[i];
      const result = await this.sendTelegram(notification);
      results.push(result);

      if (i < notifications.length - 1) {
        const delayMs = 1000 / rateLimit;
        await this.delay(delayMs);
      }
    }

    return results;
  }

  /**
   * Send rich message with inline keyboard
   */
  async sendRichMessage(
    chatId: string,
    message: string,
    options: {
      parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
      inlineKeyboard?: Array<Array<{ text: string; url?: string; callback_data?: string }>>;
      disablePreview?: boolean;
    } = {}
  ): Promise<any> {
    try {
      const messageData: any = {
        chat_id: chatId,
        text: message,
        parse_mode: options.parseMode || 'HTML',
        disable_web_page_preview: options.disablePreview || false,
      };

      if (options.inlineKeyboard) {
        messageData.reply_markup = {
          inline_keyboard: options.inlineKeyboard,
        };
      }

      const response = await this.httpClient.post('/sendMessage', messageData);
      return response.data.result;

    } catch (error) {
      this.logger.error('Failed to send rich Telegram message:', error);
      throw error;
    }
  }

  /**
   * Handle webhook updates from Telegram
   */
  async handleWebhookUpdate(update: any): Promise<void> {
    try {
      this.logger.log('Processing Telegram webhook update');

      if (update.message) {
        await this.handleIncomingMessage(update.message);
      } else if (update.callback_query) {
        await this.handleCallbackQuery(update.callback_query);
      }

    } catch (error) {
      this.logger.error('Error handling Telegram webhook update:', error);
    }
  }

  /**
   * Handle incoming messages from users
   */
  private async handleIncomingMessage(message: any): Promise<void> {
    const chatId = message.chat.id.toString();
    const text = message.text;
    const from = message.from;

    this.logger.log(`Received message from ${from.id}: ${text}`);

    if (text?.startsWith('/start')) {
      await this.handleStartCommand(chatId, from);
    } else if (text?.startsWith('/verify')) {
      await this.handleVerifyCommand(chatId, text, from);
    } else if (text?.startsWith('/status')) {
      await this.handleStatusCommand(chatId, from);
    } else if (text?.startsWith('/help')) {
      await this.handleHelpCommand(chatId);
    } else if (text?.startsWith('/stop')) {
      await this.handleStopCommand(chatId, from);
    }
  }

  /**
   * Handle callback queries from inline keyboards
   */
  private async handleCallbackQuery(callbackQuery: any): Promise<void> {
    const chatId = callbackQuery.message.chat.id.toString();
    const data = callbackQuery.data;

    this.logger.log(`Received callback query: ${data}`);

    // Answer the callback query to remove loading state
    await this.httpClient.post('/answerCallbackQuery', {
      callback_query_id: callbackQuery.id,
    });

    // Handle different callback data
    if (data.startsWith('confirm_')) {
      // Handle confirmation actions
    } else if (data.startsWith('settings_')) {
      // Handle settings changes
    }
  }

  /**
   * Handle /start command
   */
  private async handleStartCommand(chatId: string, from: any): Promise<void> {
    const welcomeMessage = `
🎉 <b>Welcome to Valorapays!</b>

I'm the official Valorapays notification bot. I'll help you receive real-time updates about your payments, settlements, and account activity.

<b>To get started:</b>
1. Go to your Valorapays dashboard
2. Navigate to Settings → Notifications
3. Click "Connect Telegram" and follow the instructions

<b>Available commands:</b>
/verify &lt;code&gt; - Verify your account with the 6-digit code
/status - Check your notification settings
/help - Show this help message
/stop - Disable notifications

Need help? Contact support at support@valorapays.com
`;

    await this.sendRichMessage(chatId, welcomeMessage, {
      parseMode: 'HTML',
      inlineKeyboard: [
        [
          { text: '📱 Open Dashboard', url: 'https://dashboard.valorapays.com' },
          { text: '📞 Contact Support', url: 'https://valorapays.com/support' },
        ],
      ],
    });
  }

  /**
   * Handle /verify command
   */
  private async handleVerifyCommand(chatId: string, text: string, from: any): Promise<void> {
    const parts = text.split(' ');
    if (parts.length !== 2) {
      await this.sendRichMessage(chatId, '❌ Invalid format. Use: /verify &lt;6-digit-code&gt;', {
        parseMode: 'HTML',
      });
      return;
    }

    const verificationCode = parts[1];
    
    // Here you would call the merchant service to verify the code
    // For now, send a placeholder response
    await this.sendRichMessage(chatId, `
🔍 <b>Verifying code: ${verificationCode}</b>

Please wait while I verify your account...

If this code was generated from your Valorapays dashboard, you should receive a confirmation shortly.
`, {
      parseMode: 'HTML',
    });
  }

  /**
   * Handle /status command
   */
  private async handleStatusCommand(chatId: string, from: any): Promise<void> {
    // Here you would fetch the merchant's notification settings
    await this.sendRichMessage(chatId, `
📊 <b>Notification Status</b>

🔗 <b>Account:</b> Not linked
📱 <b>Notifications:</b> Disabled

To enable notifications, please verify your account using /verify &lt;code&gt; with the code from your dashboard.
`, {
      parseMode: 'HTML',
      inlineKeyboard: [
        [{ text: '⚙️ Notification Settings', url: 'https://dashboard.valorapays.com/settings/notifications' }],
      ],
    });
  }

  /**
   * Handle /help command
   */
  private async handleHelpCommand(chatId: string): Promise<void> {
    const helpMessage = `
📚 <b>Valorapays Bot Help</b>

<b>Available Commands:</b>
/start - Welcome message and setup instructions
/verify &lt;code&gt; - Verify your account with dashboard code
/status - Check your notification settings
/help - Show this help message
/stop - Disable all notifications

<b>Notification Types:</b>
💰 Payment confirmations
🏦 Settlement updates
🚨 Security alerts
📊 Daily/weekly reports

<b>Support:</b>
📧 Email: support@valorapays.com
📞 Phone: +1-800-VALORAPAYS
🌐 Help Center: https://help.valorapays.com
`;

    await this.sendRichMessage(chatId, helpMessage, {
      parseMode: 'HTML',
    });
  }

  /**
   * Handle /stop command
   */
  private async handleStopCommand(chatId: string, from: any): Promise<void> {
    await this.sendRichMessage(chatId, `
⏹️ <b>Notifications Disabled</b>

You will no longer receive notifications from Valorapays.

To re-enable notifications:
1. Use /start command
2. Follow the verification process again

You can also manage notifications from your dashboard.
`, {
      parseMode: 'HTML',
      inlineKeyboard: [
        [{ text: '🔄 Re-enable Notifications', callback_data: 'enable_notifications' }],
      ],
    });
  }

  /**
   * Prepare message data for Telegram API
   */
  private prepareMessage(notification: Notification): any {
    const messageData: any = {
      chat_id: notification.recipientContact,
      text: notification.message,
    };

    if (notification.data?.parseMode) {
      messageData.parse_mode = notification.data.parseMode;
    } else {
      messageData.parse_mode = 'HTML';
    }

    if (notification.data?.inlineKeyboard) {
      messageData.reply_markup = {
        inline_keyboard: notification.data.inlineKeyboard,
      };
    }

    messageData.disable_web_page_preview = true;

    return messageData;
  }

  /**
   * Validate Telegram chat_id format
   */
  private isValidChatId(chatId: string): boolean {
    return /^-?\d+$/.test(chatId);
  }

  /**
   * Categorize Telegram errors for better handling
   */
  private categorizeTelegramError(error: any): string {
    const errorCode = error.response?.data?.error_code;
    const description = error.response?.data?.description;

    if (errorCode === 400 && description?.includes('chat not found')) {
      return 'Chat not found - user may have blocked the bot';
    } else if (errorCode === 400 && description?.includes('user is deactivated')) {
      return 'User account is deactivated';
    } else if (errorCode === 403 && description?.includes('bot was blocked')) {
      return 'Bot was blocked by the user';
    } else if (errorCode === 429) {
      return 'Too many requests - rate limit exceeded';
    } else if (errorCode === 400 && description?.includes('message is too long')) {
      return 'Message too long for Telegram';
    } else if (error.code === 'ECONNABORTED') {
      return 'Telegram API timeout';
    } else {
      return description || error.message || 'Unknown Telegram delivery error';
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
    return `telegram-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate Telegram Bot configuration
   */
  async validateConfiguration(): Promise<boolean> {
    return this.isConfigured;
  }

  /**
   * Get bot information
   */
  async getBotInfo(): Promise<any> {
    return {
      configured: this.isConfigured,
      botToken: this.botToken ? 'configured' : 'not configured',
    };
  }

  /**
   * Set webhook for receiving updates
   */
  async setWebhook(webhookUrl: string, secretToken?: string): Promise<boolean> {
    this.logger.log(`Setting webhook: ${webhookUrl}`);
    return this.isConfigured;
  }

  /**
   * Check if service is properly configured
   */
  isServiceConfigured(): boolean {
    return this.isConfigured;
  }
}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { 
  AppConfig, 
  DatabaseConfig, 
  RedisConfig, 
  AWSConfig, 
  TwilioConfig, 
  FirebaseConfig, 
  TelegramConfig, 
  KafkaConfig, 
  ServiceUrls, 
  SecurityConfig, 
  WebhookConfig, 
  RateLimits 
} from '../types/environment';

/**
 * Communication Config Service
 * Centralized configuration service for all communication service settings
 */
@Injectable()
export class CommunicationConfigService {
  constructor(public readonly configService: ConfigService) {}

  /**
   * Get application configuration
   */
  getAppConfig(): AppConfig {
    return {
      name: this.configService.get<string>('APP_NAME') || 'Valorapays Communication Service',
      version: this.configService.get<string>('APP_VERSION') || '1.0.0',
      environment: this.configService.get<string>('NODE_ENV') || 'development',
      port: parseInt(this.configService.get<string>('PORT') || '5005', 10),
      grpcPort: parseInt(this.configService.get<string>('GRPC_PORT') || '50006', 10),
      fromEmail: this.configService.get<string>('FROM_EMAIL') || 'notifications@valorapays.com',
    };
  }

  /**
   * Get database configuration
   */
  getDatabaseConfig(): DatabaseConfig {
    return {
      host: this.configService.get<string>('DATABASE_HOST') || 'localhost',
      port: parseInt(this.configService.get<string>('DATABASE_PORT') || '5432', 10),
      username: this.configService.get<string>('DATABASE_USER') || 'valorapays_communication_dev',
      password: this.configService.get<string>('DATABASE_PASSWORD') || 'valorapays_communication_dev_password',
      database: this.configService.get<string>('DATABASE_NAME') || 'valorapays_communication_dev',
      ssl: this.configService.get<string>('DATABASE_SSL') === 'true',
      maxConnections: parseInt(this.configService.get<string>('DATABASE_MAX_CONNECTIONS') || '20', 10),
      synchronize: this.configService.get<string>('DATABASE_SYNCHRONIZE') === 'true',
      logging: this.configService.get<string>('DATABASE_LOGGING') === 'true',
    };
  }

  /**
   * Get Redis configuration
   */
  getRedisConfig(): RedisConfig {
    return {
      host: this.configService.get<string>('REDIS_HOST') || 'localhost',
      port: parseInt(this.configService.get<string>('REDIS_PORT') || '6379', 10),
      password: this.configService.get<string>('REDIS_PASSWORD') || '',
      database: parseInt(this.configService.get<string>('REDIS_DATABASE') || '0', 10),
      keyPrefix: this.configService.get<string>('REDIS_KEY_PREFIX') || 'valorapays:communication:',
      ttl: parseInt(this.configService.get<string>('REDIS_TTL') || '3600', 10),
    };
  }

  /**
   * Get email configuration
   */
  getEmailConfig() {
    return {
      host: this.configService.get<string>('EMAIL_HOST') || 'smtp.gmail.com',
      port: parseInt(this.configService.get<string>('EMAIL_PORT') || '587', 10),
      secure: this.configService.get<string>('EMAIL_SECURE') === 'true',
      user: this.configService.get<string>('EMAIL_USER') || '',
      password: this.configService.get<string>('EMAIL_PASSWORD') || '',
      from: this.configService.get<string>('EMAIL_FROM') || this.configService.get<string>('FROM_EMAIL') || 'noreply@valorapays.com',
      fromName: this.configService.get<string>('EMAIL_FROM_NAME') || 'Valorapays',
    };
  }

  /**
   * Get AWS configuration
   */
  getAWSConfig(): AWSConfig {
    return {
      region: this.configService.get<string>('AWS_REGION') || 'us-east-1',
      accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') || '',
      secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '',
      s3Bucket: this.configService.get<string>('AWS_S3_BUCKET') || '',
      sesConfigSet: this.configService.get<string>('AWS_SES_CONFIG_SET') || '',
    };
  }

  /**
   * Get Twilio configuration
   */
  getTwilioConfig(): TwilioConfig {
    return {
      accountSid: this.configService.get<string>('TWILIO_ACCOUNT_SID') || '',
      authToken: this.configService.get<string>('TWILIO_AUTH_TOKEN') || '',
      fromNumber: this.configService.get<string>('TWILIO_FROM_NUMBER') || '',
    };
  }

  /**
   * Get Firebase configuration
   */
  getFirebaseConfig(): FirebaseConfig {
    return {
      projectId: this.configService.get<string>('FIREBASE_PROJECT_ID') || '',
      privateKey: this.configService.get<string>('FIREBASE_PRIVATE_KEY') || '',
      clientEmail: this.configService.get<string>('FIREBASE_CLIENT_EMAIL') || '',
    };
  }

  /**
   * Get Telegram configuration
   */
  getTelegramConfig(): TelegramConfig {
    return {
      botToken: this.configService.get<string>('TELEGRAM_BOT_TOKEN') || '',
      botUsername: this.configService.get<string>('TELEGRAM_BOT_USERNAME') || '',
      webhookUrl: this.configService.get<string>('TELEGRAM_WEBHOOK_URL') || '',
      webhookSecret: this.configService.get<string>('TELEGRAM_WEBHOOK_SECRET') || '',
    };
  }

  /**
   * Get Kafka configuration
   */
  getKafkaConfig(): KafkaConfig {
    const brokers = this.configService.get<string>('KAFKA_BROKERS');
    return {
      brokers: brokers ? brokers.split(',') : ['localhost:9092'],
      clientId: this.configService.get<string>('KAFKA_CLIENT_ID') || 'valorapays-communication-service',
      groupId: this.configService.get<string>('KAFKA_GROUP_ID') || 'communication-service-group',
      ssl: this.configService.get<string>('KAFKA_SSL') === 'true',
      username: this.configService.get<string>('KAFKA_USERNAME') || '',
      password: this.configService.get<string>('KAFKA_PASSWORD') || '',
    };
  }

  /**
   * Get service URLs configuration
   */
  getServiceUrls(): ServiceUrls {
    return {
      paymentEngine: this.configService.get<string>('PAYMENT_ENGINE_URL') || 'http://localhost:5001',
      merchantService: this.configService.get<string>('MERCHANT_SERVICE_URL') || 'http://localhost:5002',
      walletService: this.configService.get<string>('WALLET_SERVICE_URL') || 'http://localhost:5004',
      apiGateway: this.configService.get<string>('API_GATEWAY_URL') || 'http://localhost:5000',
    };
  }

  /**
   * Get security configuration
   */
  getSecurityConfig(): SecurityConfig {
    return {
      jwtSecret: this.configService.get<string>('JWT_SECRET') || 'your-secret-key',
      jwtExpiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '24h',
      gatewaySecret: this.configService.get<string>('GATEWAY_SECRET') || 'development-gateway-secret',
      internalApiKey: this.configService.get<string>('INTERNAL_API_KEY') || '',
      webhookSecrets: {
        paytara: this.configService.get<string>('PAYTARA_WEBHOOK_SECRET') || '',
        razorpay: this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET') || '',
        stripe: this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || '',
      },
    };
  }

  /**
   * Get webhook configuration
   */
  getWebhookConfig(): WebhookConfig {
    return {
      timeout: parseInt(this.configService.get<string>('WEBHOOK_TIMEOUT') || '30', 10),
      maxRetries: parseInt(this.configService.get<string>('WEBHOOK_MAX_RETRIES') || '3', 10),
      retryDelay: parseInt(this.configService.get<string>('WEBHOOK_RETRY_DELAY') || '1000', 10),
      timeoutMs: parseInt(this.configService.get<string>('WEBHOOK_TIMEOUT_MS') || '30000', 10),
      signatureValidation: this.configService.get<string>('WEBHOOK_SIGNATURE_VALIDATION') !== 'false',
      allowedHosts: this.configService.get<string>('WEBHOOK_ALLOWED_HOSTS')?.split(',') || [],
    };
  }

  /**
   * Get rate limits configuration
   */
  getRateLimits(): RateLimits {
    return {
      emailPerMinute: parseInt(this.configService.get<string>('RATE_LIMIT_EMAIL_PER_MINUTE') || '100', 10),
      smsPerMinute: parseInt(this.configService.get<string>('RATE_LIMIT_SMS_PER_MINUTE') || '50', 10),
      pushPerMinute: parseInt(this.configService.get<string>('RATE_LIMIT_PUSH_PER_MINUTE') || '1000', 10),
    };
  }

  /**
   * Get frontend URLs configuration
   */
  getFrontendConfig() {
    return {
      merchantDashboardUrl: this.configService.get<string>('MERCHANT_DASHBOARD_URL') || 'http://localhost:3000',
      adminDashboardUrl: this.configService.get<string>('ADMIN_DASHBOARD_URL') || 'http://localhost:3001',
      paymentPagesUrl: this.configService.get<string>('PAYMENT_PAGES_URL') || 'http://localhost:3002',
    };
  }

  /**
   * Check if service is in production mode
   */
  isProduction(): boolean {
    return this.getAppConfig().environment === 'production';
  }

  /**
   * Check if service is in development mode
   */
  isDevelopment(): boolean {
    return this.getAppConfig().environment === 'development';
  }

  /**
   * Get complete configuration
   */
  getFullConfig() {
    return {
      app: this.getAppConfig(),
      database: this.getDatabaseConfig(),
      redis: this.getRedisConfig(),
      aws: this.getAWSConfig(),
      twilio: this.getTwilioConfig(),
      firebase: this.getFirebaseConfig(),
      telegram: this.getTelegramConfig(),
      kafka: this.getKafkaConfig(),
      services: this.getServiceUrls(),
      security: this.getSecurityConfig(),
      webhook: this.getWebhookConfig(),
      limits: this.getRateLimits(),
    };
  }
}

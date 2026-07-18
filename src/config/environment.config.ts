import { ConfigService } from '@nestjs/config';

/**
 * Environment Configuration
 * Centralized environment variable access
 */
export const EnvironmentConfig = () => ({
  // Application Configuration
  app: {
    name: 'valorapays-communication-service',
    port: parseInt(process.env.PORT || '5006', 10),
    environment: process.env.NODE_ENV || 'development',
    grpcPort: parseInt(process.env.GRPC_PORT || '50006', 10),
    logLevel: process.env.LOG_LEVEL || 'info',
  },

  // Database Configuration
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    name: process.env.DATABASE_NAME || 'valorapays_communication_dev',
    synchronize: process.env.DATABASE_SYNC === 'true' || false,
    logging: process.env.DATABASE_LOGGING === 'true' || false,
    ssl: process.env.DATABASE_SSL === 'true' || false,
  },

  // Redis Configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    database: parseInt(process.env.REDIS_DATABASE || '5', 10),
    ttl: parseInt(process.env.REDIS_TTL || '3600', 10),
  },

  // External Services
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    sesConfigSet: process.env.AWS_SES_CONFIG_SET || '',
  },

  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true' || false,
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || '',
    from: process.env.EMAIL_FROM || 'noreply@valorapays.com',
    fromName: process.env.EMAIL_FROM_NAME || 'Valorapays',
  },

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    fromNumber: process.env.TWILIO_FROM_NUMBER || '',
  },

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
  },

  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    botUsername: process.env.TELEGRAM_BOT_USERNAME || '',
    webhookUrl: process.env.TELEGRAM_WEBHOOK_URL || '',
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET || '',
  },

  // Kafka Configuration
  kafka: {
    brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
    clientId: process.env.KAFKA_CLIENT_ID || 'valorapays-communication-service',
    groupId: process.env.KAFKA_GROUP_ID || 'communication-service-group',
    username: process.env.KAFKA_USERNAME || '',
    password: process.env.KAFKA_PASSWORD || '',
  },

  // Internal Services
  services: {
    paymentEngine: {
      url: process.env.PAYMENT_ENGINE_GRPC_URL || 'localhost:50050',
    },
    merchantService: {
      url: process.env.MERCHANT_SERVICE_GRPC_URL || 'localhost:50052',
    },
    walletService: {
      url: process.env.WALLET_SERVICE_GRPC_URL || 'localhost:50051',
    },
  },

  // Security
  security: {
    jwtSecret: process.env.JWT_SECRET || 'development-secret-key',
    gatewaySecret: process.env.GATEWAY_SECRET || 'development-gateway-secret',
    internalServiceSecret: process.env.INTERNAL_SERVICE_SECRET || 'valorapays-internal-secret-2024',
    webhookSecrets: {
      paytara: process.env.PAYTARA_WEBHOOK_SECRET || '',
      razorpay: process.env.RAZORPAY_WEBHOOK_SECRET || '',
      stripe: process.env.STRIPE_WEBHOOK_SECRET || '',
    },
  },

  // Webhook Configuration
  webhook: {
    timeout: parseInt(process.env.WEBHOOK_TIMEOUT || '30000', 10),
    maxRetries: parseInt(process.env.WEBHOOK_MAX_RETRIES || '3', 10),
    retryDelay: parseInt(process.env.WEBHOOK_RETRY_DELAY || '1000', 10),
  },

  // Notification Limits
  limits: {
    emailPerMinute: parseInt(process.env.EMAIL_RATE_LIMIT || '100', 10),
    smsPerMinute: parseInt(process.env.SMS_RATE_LIMIT || '50', 10),
    pushPerMinute: parseInt(process.env.PUSH_RATE_LIMIT || '1000', 10),
  },

  // Frontend URLs
  frontend: {
    merchantDashboardUrl: process.env.MERCHANT_DASHBOARD_URL || 'http://localhost:3000',
    adminDashboardUrl: process.env.ADMIN_DASHBOARD_URL || 'http://localhost:3001',
    paymentPagesUrl: process.env.PAYMENT_PAGES_URL || 'http://localhost:3002',
  },
});

/**
 * Simple typed configuration getters
 */
export class EnvironmentConfigService {
  constructor(private configService: ConfigService) {}

  get appName(): string {
    return this.configService.get<string>('app.name') || 'valorapays-communication-service';
  }

  get port(): number {
    return this.configService.get<number>('app.port') || 5005;
  }

  get grpcPort(): number {
    return this.configService.get<number>('app.grpcPort') || 50006;
  }

  get environment(): string {
    return this.configService.get<string>('app.environment') || 'development';
  }

  get isDevelopment(): boolean {
    return this.environment === 'development';
  }

  get isProduction(): boolean {
    return this.environment === 'production';
  }

  getEmailConfig() {
    return {
      host: this.configService.get<string>('email.host') || 'smtp.gmail.com',
      port: this.configService.get<number>('email.port') || 587,
      secure: this.configService.get<boolean>('email.secure') || false,
      user: this.configService.get<string>('email.user') || '',
      password: this.configService.get<string>('email.password') || '',
      from: this.configService.get<string>('email.from') || 'noreply@valorapays.com',
      fromName: this.configService.get<string>('email.fromName') || 'Valorapays',
    };
  }

  getFrontendConfig() {
    return {
      merchantDashboardUrl: this.configService.get<string>('frontend.merchantDashboardUrl') || 'http://localhost:3000',
      adminDashboardUrl: this.configService.get<string>('frontend.adminDashboardUrl') || 'http://localhost:3001',
      paymentPagesUrl: this.configService.get<string>('frontend.paymentPagesUrl') || 'http://localhost:3002',
    };
  }

  getAWSConfig() {
    return {
      region: this.configService.get<string>('aws.region') || 'us-east-1',
      accessKeyId: this.configService.get<string>('aws.accessKeyId') || '',
      secretAccessKey: this.configService.get<string>('aws.secretAccessKey') || '',
      sesConfigSet: this.configService.get<string>('aws.sesConfigSet') || '',
    };
  }

  getTwilioConfig() {
    return {
      accountSid: this.configService.get<string>('twilio.accountSid') || '',
      authToken: this.configService.get<string>('twilio.authToken') || '',
      fromNumber: this.configService.get<string>('twilio.fromNumber') || '',
    };
  }
}

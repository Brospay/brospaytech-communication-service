/**
 * Environment Configuration Types
 */

export interface AppConfig {
  name: string;
  version: string;
  port: number;
  environment: string;
  grpcPort: number;
  logLevel?: string;
  fromEmail: string;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  name?: string;
  maxConnections: number;
  synchronize: boolean;
  logging: boolean;
  ssl: boolean;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  database: number;
  ttl: number;
  keyPrefix: string;
}

export interface AWSConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  sesConfigSet: string;
  s3Bucket: string;
}

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

export interface FirebaseConfig {
  projectId: string;
  privateKey: string;
  clientEmail: string;
}

export interface TelegramConfig {
  botToken: string;
  botUsername: string;
  webhookUrl: string;
  webhookSecret: string;
}

export interface KafkaConfig {
  brokers: string[];
  clientId: string;
  groupId: string;
  username?: string;
  password?: string;
  ssl: boolean;
}

export interface ServiceUrls {
  paymentEngine: string;
  merchantService: string;
  walletService: string;
  apiGateway: string;
}

export interface SecurityConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  gatewaySecret: string;
  internalApiKey: string;
  webhookSecrets: {
    paytara: string;
    razorpay: string;
    stripe: string;
  };
}

export interface WebhookConfig {
  timeout: number;
  timeoutMs: number;
  maxRetries: number;
  retryDelay: number;
  signatureValidation: boolean;
  allowedHosts: string[];
}

export interface RateLimits {
  emailPerMinute: number;
  smsPerMinute: number;
  pushPerMinute: number;
}

export interface CommunicationConfig {
  app: AppConfig;
  database: DatabaseConfig;
  redis: RedisConfig;
  aws: AWSConfig;
  twilio: TwilioConfig;
  firebase: FirebaseConfig;
  telegram: TelegramConfig;
  kafka: KafkaConfig;
  services: ServiceUrls;
  security: SecurityConfig;
  webhook: WebhookConfig;
  limits: RateLimits;
}

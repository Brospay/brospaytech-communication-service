import * as Joi from 'joi';

/**
 * Environment Variables Validation Schema
 */
export const validationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(5005),
  GRPC_PORT: Joi.number().port().default(50055),
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info'),

  // Database
  DATABASE_HOST: Joi.string().default('localhost'),
  DATABASE_PORT: Joi.number().port().default(5432),
  DATABASE_USERNAME: Joi.string().default('postgres'),
  DATABASE_PASSWORD: Joi.string().default('postgres'),
  DATABASE_NAME: Joi.string().default('valorapays_communication'),
  DATABASE_SYNC: Joi.boolean().default(false),
  DATABASE_LOGGING: Joi.boolean().default(false),
  DATABASE_SSL: Joi.boolean().default(false),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),
  REDIS_DATABASE: Joi.number().min(0).max(15).default(0),
  REDIS_TTL: Joi.number().positive().default(3600),

  // AWS Services
  AWS_REGION: Joi.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: Joi.string().allow(''),
  AWS_SECRET_ACCESS_KEY: Joi.string().allow(''),
  AWS_SES_CONFIG_SET: Joi.string().allow(''),

  // Twilio
  TWILIO_ACCOUNT_SID: Joi.string().allow(''),
  TWILIO_AUTH_TOKEN: Joi.string().allow(''),
  TWILIO_FROM_NUMBER: Joi.string().allow(''),

  // Firebase
  FIREBASE_PROJECT_ID: Joi.string().allow(''),
  FIREBASE_PRIVATE_KEY: Joi.string().allow(''),
  FIREBASE_CLIENT_EMAIL: Joi.string().allow(''),

  // Telegram
  TELEGRAM_BOT_TOKEN: Joi.string().allow(''),
  TELEGRAM_BOT_USERNAME: Joi.string().allow(''),
  TELEGRAM_WEBHOOK_URL: Joi.string().uri().allow(''),
  TELEGRAM_WEBHOOK_SECRET: Joi.string().allow(''),

  // Kafka
  KAFKA_BROKERS: Joi.string().default('localhost:9092'),
  KAFKA_CLIENT_ID: Joi.string().default('valorapays-communication-service'),
  KAFKA_GROUP_ID: Joi.string().default('communication-service-group'),
  KAFKA_USERNAME: Joi.string().allow(''),
  KAFKA_PASSWORD: Joi.string().allow(''),

  // Internal Services
  PAYMENT_ENGINE_GRPC_URL: Joi.string().default('localhost:50050'),
  MERCHANT_SERVICE_GRPC_URL: Joi.string().default('localhost:50052'),
  WALLET_SERVICE_GRPC_URL: Joi.string().default('localhost:50051'),

  // Security
  JWT_SECRET: Joi.string().min(32).default('development-secret-key'),
  GATEWAY_SECRET: Joi.string().min(32).default('development-gateway-secret'),
  PAYTARA_WEBHOOK_SECRET: Joi.string().allow(''),
  RAZORPAY_WEBHOOK_SECRET: Joi.string().allow(''),
  STRIPE_WEBHOOK_SECRET: Joi.string().allow(''),

  // Webhook Configuration
  WEBHOOK_TIMEOUT: Joi.number().positive().default(30000),
  WEBHOOK_MAX_RETRIES: Joi.number().min(0).max(10).default(3),
  WEBHOOK_RETRY_DELAY: Joi.number().positive().default(1000),

  // Rate Limits
  EMAIL_RATE_LIMIT: Joi.number().positive().default(100),
  SMS_RATE_LIMIT: Joi.number().positive().default(50),
  PUSH_RATE_LIMIT: Joi.number().positive().default(1000),
});

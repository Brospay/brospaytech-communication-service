# Valorapays Communication Service

Multi-channel Communication Platform for Email, SMS, Push Notifications, and Webhooks.

## Overview

The Communication Service handles all platform communication including:
- **Email**: Transactional and promotional emails via AWS SES
- **SMS**: Text messaging via Twilio
- **Push Notifications**: Mobile alerts via Firebase FCM
- **Webhooks**: Inbound and outbound webhook delivery
- **Real-time**: WebSocket notifications via Socket.IO

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: NestJS 11
- **Database**: PostgreSQL with TypeORM
- **Cache**: Redis
- **Message Queue**: Kafka
- **Templates**: Handlebars
- **Real-time**: Socket.IO
- **Language**: TypeScript

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL 14+
- Redis 6+
- Kafka (optional)

## Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp env.development .env

# Update .env with your configuration
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | HTTP server port | `5006` |
| `GRPC_PORT` | gRPC server port | `50006` |
| `DATABASE_HOST` | PostgreSQL host | `localhost` |
| `DATABASE_PORT` | PostgreSQL port | `5432` |
| `DATABASE_NAME` | Database name | `valorapays_communication` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |

### Email Configuration (AWS SES)
| Variable | Description |
|----------|-------------|
| `AWS_REGION` | AWS region |
| `AWS_ACCESS_KEY_ID` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `AWS_SES_CONFIG_SET` | SES configuration set |

### SMS Configuration (Twilio)
| Variable | Description |
|----------|-------------|
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_FROM_NUMBER` | Sender phone number |

### Push Notifications (Firebase)
| Variable | Description |
|----------|-------------|
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_PRIVATE_KEY` | Firebase private key |
| `FIREBASE_CLIENT_EMAIL` | Firebase client email |

## Running the Service

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod

# Debug mode
npm run start:debug
```

## API Documentation

Swagger documentation is available at:
- Development: `http://localhost:5006/api/docs`

## Key Features

### Email Service
- Transactional emails (receipts, confirmations)
- Password reset emails
- Verification emails
- HTML template support with Handlebars
- Email tracking and delivery status

### SMS Service
- Transaction alerts
- OTP messages
- Marketing messages (with opt-in)
- Delivery receipts

### Push Notifications
- Real-time transaction alerts
- System notifications
- Promotional notifications
- iOS and Android support

### Webhook Management
- Inbound webhook processing from TSPs
- Outbound webhook delivery to merchants
- Automatic retry with exponential backoff
- Webhook signature verification

### Real-time Communication
- WebSocket connections for live updates
- Transaction status updates
- System alerts

## Rate Limiting

The service implements rate limiting per channel:
- Email: 100 emails/minute (configurable)
- SMS: 50 messages/minute (configurable)
- Push: 1000 notifications/minute (configurable)

## Project Structure

```
src/
├── common/            # Shared utilities
├── config/            # Configuration
├── dto/               # Data transfer objects
├── entities/          # TypeORM entities
├── modules/           # Feature modules
└── main.ts            # Application entry
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Health Check

```bash
curl http://localhost:5006/health
```

## License

License by WebBuddy LLC

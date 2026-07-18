import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { CommunicationConfigService } from './config';
import * as path from 'path';

/**
 * Bootstrap Communication Service
 * Sets up both HTTP REST API and gRPC microservice
 */
async function bootstrap() {
  const logger = new Logger('CommunicationService');

  // Create the NestJS application
  const app = await NestFactory.create(AppModule);

  // Get configuration service
  const configService = app.get(CommunicationConfigService);
  const appConfig = configService.getAppConfig();

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: appConfig.environment === 'production',
    }),
  );

  // Enable CORS
  app.enableCors({
    origin: appConfig.environment === 'production' 
      ? ['https://pay.valorapays.com', 'https://dashboard.valorapays.com', 'https://admin.valorapays.com']
      : true,
    credentials: true,
  });

  
  
  app.setGlobalPrefix('communication/api/v1');

  // Swagger documentation (only in development)
  if (appConfig.environment === 'development') {
    const config = new DocumentBuilder()
      .setTitle('Valorapays Communication Service')
      .setDescription('Multi-channel communication service for webhooks, notifications, and real-time events')
      .setVersion('1.0.0')
      .addBearerAuth()
      .addServer('http://localhost:5005', 'Development')
      .addServer('https://api.valorapays.com', 'Production')
      .addTag('Webhooks', 'TSP webhook processing and merchant delivery')
      .addTag('Notifications', 'Multi-channel notification delivery')
      .addTag('Templates', 'Notification template management')
      .addTag('Event Streaming', 'Real-time event broadcasting')
      .addTag('Alerts', 'System and business alert management')
      .addTag('Health', 'Service health and monitoring')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });

    logger.log(`📚 Swagger documentation available at: http://localhost:${appConfig.port}/docs`);
  }


  // Set up gRPC microservice
  const grpcOptions: MicroserviceOptions = {
    transport: Transport.GRPC,
    options: {
      package: 'communication',
      protoPath: path.join(__dirname, '../proto/communication.proto'),
      url: `0.0.0.0:${appConfig.grpcPort}`,
      maxSendMessageLength: 1024 * 1024 * 4, // 4MB
      maxReceiveMessageLength: 1024 * 1024 * 4, // 4MB
      loader: {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
        arrays: true,
      },
    },
  };

  // Start gRPC microservice
  app.connectMicroservice(grpcOptions);
  await app.startAllMicroservices();

  // Start HTTP server
  await app.listen(appConfig.port, '0.0.0.0');

  logger.log(`Communication Service started successfully!`);
  logger.log(`HTTP REST API: http://localhost:${appConfig.port}/api/v1`);
  logger.log(`gRPC Service: http://localhost:${appConfig.grpcPort}`);
  logger.log(`Environment: ${appConfig.environment}`);
  logger.log(`Health Check: http://localhost:${appConfig.port}/api/v1/health`);
  
  if (appConfig.environment === 'development') {
    logger.log(`Development mode: Auto-reload enabled`);
  }

  // Graceful shutdown handling
  process.on('SIGTERM', async () => {
    logger.log('Received SIGTERM, shutting down gracefully...');
    await app.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.log('Received SIGINT, shutting down gracefully...');
    await app.close();
    process.exit(0);
  });
}

// Start the application
bootstrap().catch((error) => {
  const logger = new Logger('CommunicationService');
  logger.error('Failed to start Communication Service:', error);
  process.exit(1);
});
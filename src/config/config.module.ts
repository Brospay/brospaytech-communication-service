import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EnvironmentConfig } from './environment.config';
import { validationSchema } from './validation.schema';
import { CommunicationConfigService } from './communication.config';

/**
 * Application Configuration Module
 * Handles environment variables and configuration validation
 */
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `.env.${process.env.NODE_ENV}`,
        '.env.development',
        '.env.production',
        '.env.local',
        '.env'
      ],
      load: [EnvironmentConfig],
      validationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
  ],
  providers: [CommunicationConfigService],
  exports: [CommunicationConfigService],
})
export class AppConfigModule {}

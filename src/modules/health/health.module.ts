import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { InternalServiceGuard, CombinedAuthGuard } from '../../common';

/**
 * Health Module
 * Provides health check functionality for monitoring
 */
@Module({
  imports: [ConfigModule], // Needed for InternalServiceGuard
  controllers: [HealthController],
  providers: [
    InternalServiceGuard,
    CombinedAuthGuard,
  ],
})
export class HealthModule {}

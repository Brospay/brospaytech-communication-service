import { Module } from '@nestjs/common';
import { RedisConfigService } from './redis.config';

/**
 * Redis Module
 * Provides Redis configuration and caching services
 */
@Module({
  providers: [RedisConfigService],
  exports: [RedisConfigService],
})
export class RedisModule {}

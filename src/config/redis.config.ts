import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Redis Configuration Service
 * Provides Redis connection and caching functionality
 */
@Injectable()
export class RedisConfigService {
  private readonly redisClient: Redis;
  private readonly publisher: Redis;
  private readonly subscriber: Redis;

  constructor(private configService: ConfigService) {
    const redisConfig = {
      host: this.configService.get<string>('redis.host'),
      port: this.configService.get<number>('redis.port'),
      password: this.configService.get<string>('redis.password'),
      db: this.configService.get<number>('redis.database'),
      retryDelayOnFailure: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
    };

    this.redisClient = new Redis(redisConfig);
    this.publisher = new Redis(redisConfig);
    this.subscriber = new Redis(redisConfig);
  }

  /**
   * Get main Redis client for caching
   */
  getClient(): Redis {
    return this.redisClient;
  }

  /**
   * Get Redis publisher for pub/sub
   */
  getPublisher(): Redis {
    return this.publisher;
  }

  /**
   * Get Redis subscriber for pub/sub
   */
  getSubscriber(): Redis {
    return this.subscriber;
  }

  /**
   * Cache data with TTL
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<string> {
    const serializedValue = JSON.stringify(value);
    const ttl = ttlSeconds || this.configService.get<number>('redis.ttl') || 3600;
    
    return this.redisClient.setex(key, ttl, serializedValue);
  }

  /**
   * Get cached data
   */
  async get<T>(key: string): Promise<T | null> {
    const value = await this.redisClient.get(key);
    return value ? JSON.parse(value) : null;
  }

  /**
   * Delete cached data
   */
  async del(key: string): Promise<number> {
    return this.redisClient.del(key);
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<number> {
    return this.redisClient.exists(key);
  }

  /**
   * Set with expiration
   */
  async setex(key: string, seconds: number, value: any): Promise<string> {
    const serializedValue = JSON.stringify(value);
    return this.redisClient.setex(key, seconds, serializedValue);
  }

  /**
   * Increment counter
   */
  async incr(key: string): Promise<number> {
    return this.redisClient.incr(key);
  }

  /**
   * Increment counter with expiration
   */
  async incrWithExpiry(key: string, ttlSeconds: number): Promise<number> {
    const multi = this.redisClient.multi();
    multi.incr(key);
    multi.expire(key, ttlSeconds);
    const results = await multi.exec();
    return results?.[0]?.[1] as number || 0;
  }

  /**
   * Publish message to channel
   */
  async publish(channel: string, message: any): Promise<number> {
    const serializedMessage = JSON.stringify(message);
    return this.publisher.publish(channel, serializedMessage);
  }

  /**
   * Subscribe to channel
   */
  subscribe(channel: string, callback: (message: any) => void): void {
    this.subscriber.subscribe(channel);
    this.subscriber.on('message', (receivedChannel, message) => {
      if (receivedChannel === channel) {
        try {
          const parsedMessage = JSON.parse(message);
          callback(parsedMessage);
        } catch (error) {
          console.error('Error parsing Redis message:', error);
        }
      }
    });
  }

  /**
   * Health check for Redis connection
   */
  async ping(): Promise<string> {
    return this.redisClient.ping();
  }

  /**
   * Close all Redis connections
   */
  async disconnect(): Promise<void> {
    await Promise.all([
      this.redisClient.disconnect(),
      this.publisher.disconnect(),
      this.subscriber.disconnect(),
    ]);
  }
}

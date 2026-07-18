import { Injectable, Logger } from '@nestjs/common';
import { RedisConfigService } from '../config';

/**
 * Webhook Deduplication Utility
 * Prevents processing duplicate webhook events from TSPs
 */
@Injectable()
export class WebhookDeduplicationService {
  private readonly logger = new Logger(WebhookDeduplicationService.name);
  private readonly DEDUP_TTL = 24 * 60 * 60; // 24 hours in seconds
  private readonly DEDUP_KEY_PREFIX = 'webhook:dedup:';

  constructor(private readonly redisService: RedisConfigService) {}

  /**
   * Check if webhook event has already been processed
   */
  async isDuplicate(
    tsp: string,
    tspEventId: string,
    merchantId?: string,
  ): Promise<boolean> {
    try {
      if (!tspEventId) {
        // If no TSP event ID, we can't deduplicate reliably
        this.logger.warn('No TSP event ID provided for deduplication check');
        return false;
      }

      const dedupKey = this.generateDedupKey(tsp, tspEventId, merchantId);
      const exists = await this.redisService.exists(dedupKey);
      
      if (exists) {
        this.logger.warn(`Duplicate webhook detected: ${dedupKey}`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('Error checking webhook duplication:', error);
      // On error, allow processing to prevent webhook loss
      return false;
    }
  }

  /**
   * Mark webhook event as processed
   */
  async markAsProcessed(
    tsp: string,
    tspEventId: string,
    webhookEventId: string,
    merchantId?: string,
  ): Promise<void> {
    try {
      if (!tspEventId) {
        this.logger.warn('No TSP event ID provided for deduplication marking');
        return;
      }

      const dedupKey = this.generateDedupKey(tsp, tspEventId, merchantId);
      const dedupData = {
        webhookEventId,
        tsp,
        tspEventId,
        merchantId: merchantId || null,
        processedAt: new Date().toISOString(),
        ttl: this.DEDUP_TTL,
      };

      await this.redisService.setex(
        dedupKey,
        this.DEDUP_TTL,
        dedupData,
      );

      this.logger.debug(`Marked webhook as processed: ${dedupKey}`);
    } catch (error) {
      this.logger.error('Error marking webhook as processed:', error);
      // Don't throw error to prevent webhook processing failure
    }
  }

  /**
   * Check if similar webhook was recently processed
   * Used for additional duplicate detection based on content
   */
  async isSimilarWebhookProcessed(
    tsp: string,
    transactionId: string,
    eventType: string,
    merchantId?: string,
  ): Promise<boolean> {
    try {
      if (!transactionId) {
        return false;
      }

      const similarKey = this.generateSimilarKey(
        tsp,
        transactionId,
        eventType,
        merchantId,
      );
      const exists = await this.redisService.exists(similarKey);
      
      if (exists) {
        this.logger.warn(`Similar webhook recently processed: ${similarKey}`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('Error checking similar webhook:', error);
      return false;
    }
  }

  /**
   * Mark similar webhook as processed
   */
  async markSimilarAsProcessed(
    tsp: string,
    transactionId: string,
    eventType: string,
    webhookEventId: string,
    merchantId?: string,
  ): Promise<void> {
    try {
      if (!transactionId) {
        return;
      }

      const similarKey = this.generateSimilarKey(
        tsp,
        transactionId,
        eventType,
        merchantId,
      );
      const similarData = {
        webhookEventId,
        tsp,
        transactionId,
        eventType,
        merchantId: merchantId || null,
        processedAt: new Date().toISOString(),
      };

      // Shorter TTL for similar webhook tracking (1 hour)
      await this.redisService.setex(similarKey, 3600, similarData);

      this.logger.debug(`Marked similar webhook as processed: ${similarKey}`);
    } catch (error) {
      this.logger.error('Error marking similar webhook as processed:', error);
    }
  }

  /**
   * Get deduplication statistics
   */
  async getDeduplicationStats(): Promise<{
    totalKeys: number;
    keysByTsp: Record<string, number>;
    oldestKey: string | null;
    newestKey: string | null;
  }> {
    try {
      const pattern = `${this.DEDUP_KEY_PREFIX}*`;
      const keys = await this.redisService.getClient().keys(pattern);
      
      const keysByTsp: Record<string, number> = {};
      let oldestKey: string | null = null;
      let newestKey: string | null = null;
      let oldestTime = Date.now();
      let newestTime = 0;

      for (const key of keys) {
        const data = await this.redisService.get(key) as any;
        if (data && data.tsp) {
          keysByTsp[data.tsp] = (keysByTsp[data.tsp] || 0) + 1;
          
          const processedTime = new Date(data.processedAt).getTime();
          if (processedTime < oldestTime) {
            oldestTime = processedTime;
            oldestKey = key;
          }
          if (processedTime > newestTime) {
            newestTime = processedTime;
            newestKey = key;
          }
        }
      }

      return {
        totalKeys: keys.length,
        keysByTsp,
        oldestKey,
        newestKey,
      };
    } catch (error) {
      this.logger.error('Error getting deduplication stats:', error);
      return {
        totalKeys: 0,
        keysByTsp: {},
        oldestKey: null,
        newestKey: null,
      };
    }
  }

  /**
   * Clear expired deduplication entries manually
   */
  async clearExpiredEntries(): Promise<number> {
    try {
      const pattern = `${this.DEDUP_KEY_PREFIX}*`;
      const keys = await this.redisService.getClient().keys(pattern);
      let clearedCount = 0;

      for (const key of keys) {
        const ttl = await this.redisService.getClient().ttl(key);
        if (ttl === -1) {
          // Key exists but has no TTL, remove it
          await this.redisService.del(key);
          clearedCount++;
        }
      }

      this.logger.log(`Cleared ${clearedCount} expired deduplication entries`);
      return clearedCount;
    } catch (error) {
      this.logger.error('Error clearing expired entries:', error);
      return 0;
    }
  }

  /**
   * Generate deduplication key
   */
  private generateDedupKey(
    tsp: string,
    tspEventId: string,
    merchantId?: string,
  ): string {
    const parts = [this.DEDUP_KEY_PREFIX, tsp.toLowerCase(), tspEventId];
    if (merchantId) {
      parts.push(merchantId);
    }
    return parts.join(':');
  }

  /**
   * Generate similar webhook key
   */
  private generateSimilarKey(
    tsp: string,
    transactionId: string,
    eventType: string,
    merchantId?: string,
  ): string {
    const parts = [
      'webhook:similar:',
      tsp.toLowerCase(),
      transactionId,
      eventType.toLowerCase(),
    ];
    if (merchantId) {
      parts.push(merchantId);
    }
    return parts.join(':');
  }

  /**
   * Get deduplication info for a specific webhook
   */
  async getDedupInfo(
    tsp: string,
    tspEventId: string,
    merchantId?: string,
  ): Promise<any> {
    try {
      const dedupKey = this.generateDedupKey(tsp, tspEventId, merchantId);
      const data = await this.redisService.get(dedupKey);
      
      if (data) {
        const ttl = await this.redisService.getClient().ttl(dedupKey);
        return {
          ...data,
          remainingTtl: ttl,
          expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
        };
      }
      
      return null;
    } catch (error) {
      this.logger.error('Error getting dedup info:', error);
      return null;
    }
  }
}

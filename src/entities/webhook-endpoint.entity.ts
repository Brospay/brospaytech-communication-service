import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  CreateDateColumn, 
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

/**
 * Webhook Endpoint Entity
 * Stores merchant webhook endpoint configurations
 */
@Entity('webhook_endpoints')
@Index(['merchantId'])
@Index(['isActive'])
@Index(['status'])
@Unique(['merchantId', 'url'])
export class WebhookEndpoint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 50,
    comment: 'Merchant ID who owns this endpoint',
  })
  merchantId: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Friendly name for the endpoint',
  })
  name: string;

  @Column({
    type: 'varchar',
    length: 500,
    comment: 'Webhook URL endpoint',
  })
  url: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Secret key for signing webhooks',
  })
  secret: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'active',
    comment: 'Endpoint status: active, inactive, failed, disabled',
  })
  status: string;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Whether this endpoint is active for deliveries',
  })
  isActive: boolean;

  @Column({
    type: 'json',
    comment: 'Array of enabled event types for this endpoint',
  })
  enabledEvents: string[];

  @Column({
    type: 'varchar',
    length: 10,
    default: 'POST',
    comment: 'HTTP method for webhook delivery',
  })
  httpMethod: string;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Custom headers to include with webhook requests',
  })
  customHeaders: any;

  @Column({
    type: 'int',
    default: 3,
    comment: 'Maximum number of retry attempts',
  })
  maxRetries: number;

  @Column({
    type: 'int',
    default: 30000,
    comment: 'Request timeout in milliseconds',
  })
  timeoutMs: number;

  @Column({
    type: 'int',
    default: 1000,
    comment: 'Base retry delay in milliseconds',
  })
  retryDelayMs: number;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Whether to use exponential backoff for retries',
  })
  useExponentialBackoff: boolean;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'sha256',
    comment: 'Signature algorithm: sha256, sha512',
  })
  signatureAlgorithm: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'X-Valorapays-Signature',
    comment: 'Header name for webhook signature',
  })
  signatureHeader: string;

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'Last successful delivery timestamp',
  })
  lastSuccessAt: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'Last failed delivery timestamp',
  })
  lastFailureAt: Date;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Total number of successful deliveries',
  })
  successCount: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Total number of failed deliveries',
  })
  failureCount: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    comment: 'Success rate percentage (calculated)',
  })
  successRate: number;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Average response time in milliseconds',
  })
  avgResponseTimeMs: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Consecutive failure count (reset on success)',
  })
  consecutiveFailures: number;

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'When endpoint was last verified/tested',
  })
  lastVerifiedAt: Date;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether endpoint verification passed',
  })
  isVerified: boolean;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Last error message from delivery attempt',
  })
  lastErrorMessage: string | null;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'User agent to send with webhook requests',
  })
  userAgent: string;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Additional configuration and metadata',
  })
  metadata: any;

  @CreateDateColumn({
    type: 'timestamptz',
    comment: 'When the endpoint was created',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
    comment: 'Last update timestamp',
  })
  updatedAt: Date;

  /**
   * Check if endpoint is healthy based on recent failures
   */
  get isHealthy(): boolean {
    return this.consecutiveFailures < 5 && this.successRate > 80;
  }

  /**
   * Check if event type is enabled for this endpoint
   */
  isEventEnabled(eventType: string): boolean {
    return this.enabledEvents.includes(eventType) || this.enabledEvents.includes('*');
  }

  /**
   * Update statistics after delivery attempt
   */
  updateStats(success: boolean, responseTimeMs?: number, errorMessage?: string): void {
    const now = new Date();
    
    if (success) {
      this.successCount++;
      this.consecutiveFailures = 0;
      this.lastSuccessAt = now;
      
      if (responseTimeMs !== undefined) {
        this.avgResponseTimeMs = this.avgResponseTimeMs 
          ? Math.round((this.avgResponseTimeMs + responseTimeMs) / 2)
          : Math.round(responseTimeMs);
      }
    } else {
      this.failureCount++;
      this.consecutiveFailures++;
      this.lastFailureAt = now;
      this.lastErrorMessage = errorMessage || null;
    }
    
    // Recalculate success rate
    const totalAttempts = this.successCount + this.failureCount;
    this.successRate = totalAttempts > 0 
      ? Math.round((this.successCount / totalAttempts) * 100 * 100) / 100
      : 0;
      
    // Auto-disable endpoint after too many consecutive failures
    if (this.consecutiveFailures >= 10) {
      this.isActive = false;
      this.status = 'failed';
    }
  }
}

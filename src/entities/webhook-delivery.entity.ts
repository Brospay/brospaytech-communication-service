import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { WebhookEvent } from './webhook-event.entity';

/**
 * Webhook Delivery Entity
 * Tracks outgoing webhook deliveries to merchants
 */
@Entity('webhook_deliveries')
@Index(['merchantId', 'status'])
@Index(['webhookEventId'])
@Index(['createdAt'])
@Index(['nextRetryAt'])
export class WebhookDelivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'uuid',
    comment: 'Associated webhook event ID',
  })
  webhookEventId: string;

  @ManyToOne(() => WebhookEvent)
  @JoinColumn({ name: 'webhookEventId' })
  webhookEvent: WebhookEvent;

  @Column({
    type: 'varchar',
    length: 50,
    comment: 'Target merchant ID',
  })
  merchantId: string;

  @Column({
    type: 'varchar',
    length: 500,
    comment: 'Merchant webhook URL endpoint',
  })
  webhookUrl: string;

  @Column({
    type: 'varchar',
    length: 20,
    comment: 'HTTP method: POST, PUT',
  })
  httpMethod: string;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'HTTP headers to send with the webhook',
  })
  headers: any;

  @Column({
    type: 'jsonb',
    comment: 'Webhook payload to be sent',
  })
  payload: any;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
    comment: 'Delivery status: pending, sent, delivered, failed, timeout',
  })
  status: string;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'HTTP response status code',
  })
  responseCode: number;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'HTTP response body',
  })
  responseBody: string;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'HTTP response headers',
  })
  responseHeaders: any;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Error message if delivery failed',
  })
  errorMessage: string;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of delivery attempts',
  })
  attempts: number;

  @Column({
    type: 'int',
    default: 3,
    comment: 'Maximum retry attempts',
  })
  maxAttempts: number;

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'Next retry attempt time',
  })
  nextRetryAt: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'When the webhook was sent',
  })
  sentAt: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'When successful response was received',
  })
  deliveredAt: Date;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Response time in milliseconds',
  })
  responseTimeMs: number;

  @Column({
    type: 'varchar',
    length: 10,
    default: 'normal',
    comment: 'Delivery priority: low, normal, high, urgent',
  })
  priority: string;

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'Webhook expiration time (stop retrying after this)',
  })
  expiresAt: Date;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Signature sent with the webhook',
  })
  signature: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'Signature algorithm used',
  })
  signatureAlgorithm: string;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Additional metadata and tracking information',
  })
  metadata: any;

  @CreateDateColumn({
    type: 'timestamptz',
    comment: 'When the delivery was created',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
    comment: 'Last update timestamp',
  })
  updatedAt: Date;
}

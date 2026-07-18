import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  CreateDateColumn, 
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { WebhookDelivery } from './webhook-delivery.entity';

/**
 * Webhook Event Entity
 * Stores outbound webhook events to be delivered to merchants
 */
@Entity('webhook_events')
@Index(['eventType'])
@Index(['merchantId'])
@Index(['transactionId'])
@Index(['status'])
@Index(['createdAt'])
@Index(['scheduledAt'])
export class WebhookEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 50,
    comment: 'Event type: payment.success, refund.completed, etc.',
  })
  eventType: string;

  @Column({
    type: 'varchar',
    length: 50,
    comment: 'Merchant ID to deliver the webhook to',
  })
  merchantId: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Transaction ID associated with the event',
  })
  transactionId: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Payment ID associated with the event',
  })
  paymentId: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Refund ID associated with the event',
  })
  refundId: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Settlement ID associated with the event',
  })
  settlementId: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Chargeback ID associated with the event',
  })
  chargebackId: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Payout ID associated with the event',
  })
  payoutId: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    comment: 'Amount associated with the event',
  })
  amount: number;

  @Column({
    type: 'varchar',
    length: 3,
    nullable: true,
    comment: 'Currency code (INR, USD, etc.)',
  })
  currency: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'Status of the associated entity',
  })
  entityStatus: string;

  @Column({
    type: 'jsonb',
    comment: 'Complete event data payload to be sent to merchant',
  })
  eventData: any;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Additional metadata for the event',
  })
  metadata: any;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
    comment: 'Delivery status: pending, delivered, failed, exhausted',
  })
  status: string;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of delivery attempts',
  })
  attempts: number;

  @Column({
    type: 'int',
    default: 3,
    comment: 'Maximum number of delivery attempts',
  })
  maxAttempts: number;

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'When to attempt delivery (for scheduling)',
  })
  scheduledAt: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'When the webhook was successfully delivered',
  })
  deliveredAt: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'Next retry attempt time',
  })
  nextRetryAt: Date;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Last error message from delivery attempt',
  })
  lastErrorMessage: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'Source service that created this webhook event',
  })
  sourceService: string;

  @CreateDateColumn({
    type: 'timestamptz',
    comment: 'When the webhook event was created',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
    comment: 'Last update timestamp',
  })
  updatedAt: Date;

  // Relationships
  @OneToMany(() => WebhookDelivery, delivery => delivery.webhookEvent, {
    cascade: true,
  })
  deliveries: WebhookDelivery[];
}
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { NotificationTemplate } from './notification-template.entity';

/**
 * Notification Entity
 * Stores notification records for email, SMS, push notifications
 */
@Entity('notifications')
@Index(['channel', 'status'])
@Index(['recipientId'])
@Index(['createdAt'])
@Index(['scheduledAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 20,
    comment: 'Notification channel: email, sms, push, telegram',
  })
  channel: string;

  @Column({
    type: 'varchar',
    length: 50,
    comment: 'Notification type: payment_success, payment_failed, etc.',
  })
  type: string;

  @Column({
    type: 'uuid',
    nullable: true,
    comment: 'Recipient user/merchant ID',
  })
  recipientId: string;

  @Column({
    type: 'varchar',
    length: 100,
    comment: 'Recipient contact (email, phone number, device token)',
  })
  recipientContact: string;

  @Column({
    type: 'varchar',
    length: 200,
    comment: 'Notification subject/title',
  })
  subject: string;

  @Column({
    type: 'text',
    comment: 'Notification message body',
  })
  message: string;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Template variables and additional data',
  })
  data: any;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
    comment: 'Status: pending, sent, delivered, failed, bounced',
  })
  status: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Error message if sending failed',
  })
  errorMessage: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'External provider message ID',
  })
  externalMessageId: string;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of sending attempts',
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
    comment: 'Scheduled sending time',
  })
  scheduledAt: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'When the notification was sent',
  })
  sentAt: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'When delivery was confirmed',
  })
  deliveredAt: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'When the notification was read/opened',
  })
  readAt: Date;

  @Column({
    type: 'varchar',
    length: 10,
    default: 'normal',
    comment: 'Priority: low, normal, high, urgent',
  })
  priority: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'Source transaction/event that triggered this notification',
  })
  sourceId: string;

  @Column({
    type: 'varchar',
    length: 30,
    nullable: true,
    comment: 'Source type: transaction, webhook, manual, system',
  })
  sourceType: string;

  @Column({
    type: 'uuid',
    nullable: true,
    comment: 'Associated notification template ID',
  })
  templateId: string;

  @ManyToOne(() => NotificationTemplate, { nullable: true })
  @JoinColumn({ name: 'templateId' })
  template: NotificationTemplate;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 4,
    nullable: true,
    comment: 'Cost of sending this notification (in USD)',
  })
  cost: number;

  @Column({
    type: 'varchar',
    length: 10,
    default: 'USD',
    comment: 'Cost currency',
  })
  costCurrency: string;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Additional metadata and tracking information',
  })
  metadata: any;

  @CreateDateColumn({
    type: 'timestamptz',
    comment: 'When the notification was created',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
    comment: 'Last update timestamp',
  })
  updatedAt: Date;
}

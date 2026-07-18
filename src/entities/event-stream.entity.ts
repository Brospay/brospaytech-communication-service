import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * Event Stream Entity
 * Stores events for real-time streaming and WebSocket broadcasting
 */
@Entity('event_streams')
@Index(['eventType', 'channel'])
@Index(['recipientId'])
@Index(['createdAt'])
@Index(['status'])
export class EventStream {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 100,
    comment: 'Event type: payment.created, payment.updated, etc.',
  })
  eventType: string;

  @Column({
    type: 'varchar',
    length: 50,
    comment: 'Event channel/topic for routing',
  })
  channel: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Recipient user/merchant ID',
  })
  recipientId: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'WebSocket room/namespace for broadcasting',
  })
  room: string;

  @Column({
    type: 'jsonb',
    comment: 'Event payload data',
  })
  payload: any;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
    comment: 'Processing status: pending, sent, failed',
  })
  status: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Error message if processing failed',
  })
  errorMessage: string;

  @Column({
    type: 'varchar',
    length: 10,
    default: 'normal',
    comment: 'Event priority: low, normal, high, urgent',
  })
  priority: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'Source transaction/entity that triggered this event',
  })
  sourceId: string;

  @Column({
    type: 'varchar',
    length: 30,
    nullable: true,
    comment: 'Source type: payment, wallet, merchant, system',
  })
  sourceType: string;

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'When the event was sent/broadcasted',
  })
  sentAt: Date;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of delivery attempts',
  })
  attempts: number;

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'Next retry attempt time',
  })
  nextRetryAt: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'Event expiration time',
  })
  expiresAt: Date;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Additional metadata and tracking information',
  })
  metadata: any;

  @CreateDateColumn({
    type: 'timestamptz',
    comment: 'When the event was created',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
    comment: 'Last update timestamp',
  })
  updatedAt: Date;
}

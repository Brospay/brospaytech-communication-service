import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * Alert Entity
 * Stores system and business alerts for monitoring and escalation
 */
@Entity('alerts')
@Index(['alertType', 'severity'])
@Index(['status'])
@Index(['merchantId'])
@Index(['createdAt'])
@Index(['resolvedAt'])
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 100,
    comment: 'Alert type: system_error, payment_failure, limit_exceeded, etc.',
  })
  alertType: string;

  @Column({
    type: 'varchar',
    length: 20,
    comment: 'Alert severity: low, medium, high, critical',
  })
  severity: string;

  @Column({
    type: 'varchar',
    length: 200,
    comment: 'Alert title/summary',
  })
  title: string;

  @Column({
    type: 'text',
    comment: 'Detailed alert description',
  })
  description: string;

  @Column({
    type: 'uuid',
    nullable: true,
    comment: 'Associated merchant ID (if merchant-specific)',
  })
  merchantId: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'Source service that generated the alert',
  })
  source: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Source entity ID (transaction, payment, etc.)',
  })
  sourceId: string;

  @Column({
    type: 'jsonb',
    comment: 'Alert payload and context data',
  })
  payload: any;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'active',
    comment: 'Alert status: active, acknowledged, resolved, suppressed',
  })
  status: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'User who acknowledged the alert',
  })
  acknowledgedBy: string;

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'When the alert was acknowledged',
  })
  acknowledgedAt: Date;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'User who resolved the alert',
  })
  resolvedBy: string;

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'When the alert was resolved',
  })
  resolvedAt: Date;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Resolution notes/comments',
  })
  resolutionNotes: string;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of times this alert was triggered',
  })
  occurrenceCount: number;

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'Last occurrence time',
  })
  lastOccurrenceAt: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'When to suppress similar alerts until',
  })
  suppressedUntil: Date;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Escalation rules and history',
  })
  escalationConfig: any;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether this alert has been escalated',
  })
  isEscalated: boolean;

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'When the alert was escalated',
  })
  escalatedAt: Date;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Alert rule or condition that triggered this',
  })
  ruleId: string;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Additional metadata and tracking information',
  })
  metadata: any;

  @CreateDateColumn({
    type: 'timestamptz',
    comment: 'When the alert was first created',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
    comment: 'Last update timestamp',
  })
  updatedAt: Date;
}

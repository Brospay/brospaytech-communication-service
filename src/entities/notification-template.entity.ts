import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * Notification Template Entity
 * Stores reusable notification templates for different channels and types
 */
@Entity('notification_templates')
@Index(['channel', 'type'])
@Index(['isActive'])
@Index(['merchantId'])
export class NotificationTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 100,
    comment: 'Template name/identifier',
  })
  name: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Template description',
  })
  description: string;

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
    comment: 'Associated merchant ID (null for system templates)',
  })
  merchantId: string;

  @Column({
    type: 'varchar',
    length: 200,
    nullable: true,
    comment: 'Subject template (for email/push)',
  })
  subjectTemplate: string;

  @Column({
    type: 'text',
    comment: 'Message body template with Handlebars syntax',
  })
  bodyTemplate: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'HTML template for email notifications',
  })
  htmlTemplate: string;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Default template variables',
  })
  defaultVariables: any;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Required template variables',
  })
  requiredVariables: string[];

  @Column({
    type: 'varchar',
    length: 10,
    default: 'en',
    comment: 'Template language code',
  })
  language: string;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Whether the template is active',
  })
  isActive: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether this is the default template for this type/channel',
  })
  isDefault: boolean;

  @Column({
    type: 'varchar',
    length: 10,
    default: 'normal',
    comment: 'Template priority: low, normal, high, urgent',
  })
  priority: string;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Channel-specific configuration',
  })
  channelConfig: any;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'Template version for A/B testing',
  })
  version: string;

  @Column({
    type: 'uuid',
    nullable: true,
    comment: 'Parent template ID for versioning',
  })
  parentTemplateId: string;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Template performance metrics',
  })
  metrics: any;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'User who created the template',
  })
  createdBy: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'User who last updated the template',
  })
  updatedBy: string;

  @CreateDateColumn({
    type: 'timestamptz',
    comment: 'When the template was created',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
    comment: 'Last update timestamp',
  })
  updatedAt: Date;
}

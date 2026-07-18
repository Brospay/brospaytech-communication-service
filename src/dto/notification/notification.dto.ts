import { IsString, IsUUID, IsOptional, IsObject, IsIn, IsDateString, IsNumber, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from '../common/pagination.dto';

/**
 * Create Notification DTO
 */
export class CreateNotificationDto {
  @ApiProperty({
    description: 'Notification channel',
    enum: ['email', 'sms', 'push', 'telegram'],
  })
  @IsString()
  @IsIn(['email', 'sms', 'push', 'telegram'])
  channel: string;

  @ApiProperty({ description: 'Notification type' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Recipient user/merchant ID', required: false })
  @IsOptional()
  @IsUUID()
  recipientId?: string;

  @ApiProperty({ description: 'Recipient contact (email, phone, device token)' })
  @IsString()
  recipientContact: string;

  @ApiProperty({ description: 'Notification subject/title' })
  @IsString()
  subject: string;

  @ApiProperty({ description: 'Notification message body' })
  @IsString()
  message: string;

  @ApiProperty({ description: 'Template variables and data', required: false })
  @IsOptional()
  @IsObject()
  data?: any;

  @ApiProperty({ description: 'Template ID to use', required: false })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiProperty({
    description: 'Notification priority',
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
    required: false,
  })
  @IsOptional()
  @IsIn(['low', 'normal', 'high', 'urgent'])
  priority?: string;

  @ApiProperty({ description: 'Scheduled sending time', required: false })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiProperty({ description: 'Source ID that triggered this notification', required: false })
  @IsOptional()
  @IsString()
  sourceId?: string;

  @ApiProperty({
    description: 'Source type',
    enum: ['transaction', 'webhook', 'manual', 'system'],
    required: false,
  })
  @IsOptional()
  @IsIn(['transaction', 'webhook', 'manual', 'system'])
  sourceType?: string;

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

/**
 * Notification Response DTO
 */
export class NotificationResponseDto {
  @ApiProperty({ description: 'Notification ID' })
  id: string;

  @ApiProperty({ description: 'Notification channel' })
  channel: string;

  @ApiProperty({ description: 'Notification type' })
  type: string;

  @ApiProperty({ description: 'Recipient user/merchant ID', required: false })
  recipientId?: string;

  @ApiProperty({ description: 'Recipient contact' })
  recipientContact: string;

  @ApiProperty({ description: 'Notification subject' })
  subject: string;

  @ApiProperty({ description: 'Notification message' })
  message: string;

  @ApiProperty({ description: 'Notification status' })
  status: string;

  @ApiProperty({ description: 'External message ID', required: false })
  externalMessageId?: string;

  @ApiProperty({ description: 'Error message if failed', required: false })
  errorMessage?: string;

  @ApiProperty({ description: 'Number of attempts' })
  attempts: number;

  @ApiProperty({ description: 'Priority level' })
  priority: string;

  @ApiProperty({ description: 'Scheduled sending time', required: false })
  scheduledAt?: Date;

  @ApiProperty({ description: 'When notification was sent', required: false })
  sentAt?: Date;

  @ApiProperty({ description: 'When delivery was confirmed', required: false })
  deliveredAt?: Date;

  @ApiProperty({ description: 'When notification was read', required: false })
  readAt?: Date;

  @ApiProperty({ description: 'Cost of sending', required: false })
  cost?: number;

  @ApiProperty({ description: 'Cost currency' })
  costCurrency: string;

  @ApiProperty({ description: 'When notification was created' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

/**
 * Notification Filter DTO
 */
export class NotificationFilterDto extends PaginationDto {
  @ApiProperty({ description: 'Filter by channel', required: false })
  @IsOptional()
  @IsString()
  channel?: string;

  @ApiProperty({ description: 'Filter by type', required: false })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ description: 'Filter by recipient ID', required: false })
  @IsOptional()
  @IsUUID()
  recipientId?: string;

  @ApiProperty({ description: 'Filter by status', required: false })
  @IsOptional()
  @IsIn(['pending', 'sent', 'delivered', 'failed', 'bounced'])
  status?: string;

  @ApiProperty({ description: 'Start date for filtering', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: 'End date for filtering', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ description: 'Filter by priority', required: false })
  @IsOptional()
  @IsIn(['low', 'normal', 'high', 'urgent'])
  priority?: string;
}

/**
 * Bulk Notification Creation DTO
 */
export class BulkCreateNotificationDto {
  @ApiProperty({ description: 'List of notifications to create', type: [CreateNotificationDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateNotificationDto)
  notifications: CreateNotificationDto[];

  @ApiProperty({ description: 'Whether to process in batch mode', default: true })
  @IsOptional()
  @IsBoolean()
  batchMode?: boolean;

  @ApiProperty({ description: 'Batch processing delay in milliseconds', required: false })
  @IsOptional()
  @IsNumber()
  batchDelayMs?: number;
}

/**
 * Notification Stats DTO
 */
export class NotificationStatsDto {
  @ApiProperty({ description: 'Total notifications sent' })
  totalSent: number;

  @ApiProperty({ description: 'Successfully delivered notifications' })
  delivered: number;

  @ApiProperty({ description: 'Failed notifications' })
  failed: number;

  @ApiProperty({ description: 'Bounced notifications' })
  bounced: number;

  @ApiProperty({ description: 'Pending notifications' })
  pending: number;

  @ApiProperty({ description: 'Delivery rate percentage' })
  deliveryRate: number;

  @ApiProperty({ description: 'Average delivery time in minutes' })
  avgDeliveryTimeMinutes: number;

  @ApiProperty({ description: 'Total cost incurred' })
  totalCost: number;

  @ApiProperty({ description: 'Statistics by channel' })
  byChannel: {
    [channel: string]: {
      sent: number;
      delivered: number;
      failed: number;
      deliveryRate: number;
      totalCost: number;
    };
  };

  @ApiProperty({ description: 'Statistics by type' })
  byType: {
    [type: string]: {
      sent: number;
      delivered: number;
      failed: number;
      deliveryRate: number;
    };
  };
}

/**
 * Retry Notification DTO
 */
export class RetryNotificationDto {
  @ApiProperty({ description: 'Notification ID to retry' })
  @IsUUID()
  notificationId: string;

  @ApiProperty({ description: 'Force retry even if max attempts reached', default: false })
  @IsOptional()
  @IsBoolean()
  forceRetry?: boolean;

  @ApiProperty({ description: 'Override recipient contact', required: false })
  @IsOptional()
  @IsString()
  newRecipientContact?: string;
}

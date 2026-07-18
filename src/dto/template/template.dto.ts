import { IsString, IsUUID, IsOptional, IsObject, IsIn, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from '../common/pagination.dto';

/**
 * Create Notification Template DTO
 */
export class CreateNotificationTemplateDto {
  @ApiProperty({ description: 'Template name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Template description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

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

  @ApiProperty({ description: 'Associated merchant ID (null for system templates)', required: false })
  @IsOptional()
  @IsUUID()
  merchantId?: string;

  @ApiProperty({ description: 'Subject template (for email/push)', required: false })
  @IsOptional()
  @IsString()
  subjectTemplate?: string;

  @ApiProperty({ description: 'Message body template with Handlebars syntax' })
  @IsString()
  bodyTemplate: string;

  @ApiProperty({ description: 'HTML template for email notifications', required: false })
  @IsOptional()
  @IsString()
  htmlTemplate?: string;

  @ApiProperty({ description: 'Default template variables', required: false })
  @IsOptional()
  @IsObject()
  defaultVariables?: any;

  @ApiProperty({ description: 'Required template variables', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredVariables?: string[];

  @ApiProperty({
    description: 'Template language code',
    default: 'en',
    required: false,
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({
    description: 'Template priority',
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
    required: false,
  })
  @IsOptional()
  @IsIn(['low', 'normal', 'high', 'urgent'])
  priority?: string;

  @ApiProperty({ description: 'Channel-specific configuration', required: false })
  @IsOptional()
  @IsObject()
  channelConfig?: any;

  @ApiProperty({ description: 'Template version for A/B testing', required: false })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiProperty({ description: 'Parent template ID for versioning', required: false })
  @IsOptional()
  @IsUUID()
  parentTemplateId?: string;
}

/**
 * Update Notification Template DTO
 */
export class UpdateNotificationTemplateDto {
  @ApiProperty({ description: 'Template name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Template description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Subject template', required: false })
  @IsOptional()
  @IsString()
  subjectTemplate?: string;

  @ApiProperty({ description: 'Message body template', required: false })
  @IsOptional()
  @IsString()
  bodyTemplate?: string;

  @ApiProperty({ description: 'HTML template', required: false })
  @IsOptional()
  @IsString()
  htmlTemplate?: string;

  @ApiProperty({ description: 'Default template variables', required: false })
  @IsOptional()
  @IsObject()
  defaultVariables?: any;

  @ApiProperty({ description: 'Required template variables', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredVariables?: string[];

  @ApiProperty({ description: 'Whether template is active', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: 'Whether this is the default template', required: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiProperty({ description: 'Template priority', required: false })
  @IsOptional()
  @IsIn(['low', 'normal', 'high', 'urgent'])
  priority?: string;

  @ApiProperty({ description: 'Channel-specific configuration', required: false })
  @IsOptional()
  @IsObject()
  channelConfig?: any;
}

/**
 * Notification Template Response DTO
 */
export class NotificationTemplateResponseDto {
  @ApiProperty({ description: 'Template ID' })
  id: string;

  @ApiProperty({ description: 'Template name' })
  name: string;

  @ApiProperty({ description: 'Template description', required: false })
  description?: string;

  @ApiProperty({ description: 'Notification channel' })
  channel: string;

  @ApiProperty({ description: 'Notification type' })
  type: string;

  @ApiProperty({ description: 'Associated merchant ID', required: false })
  merchantId?: string;

  @ApiProperty({ description: 'Subject template', required: false })
  subjectTemplate?: string;

  @ApiProperty({ description: 'Body template' })
  bodyTemplate: string;

  @ApiProperty({ description: 'HTML template', required: false })
  htmlTemplate?: string;

  @ApiProperty({ description: 'Default variables', required: false })
  defaultVariables?: any;

  @ApiProperty({ description: 'Required variables', required: false })
  requiredVariables?: string[];

  @ApiProperty({ description: 'Template language' })
  language: string;

  @ApiProperty({ description: 'Whether template is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Whether this is the default template' })
  isDefault: boolean;

  @ApiProperty({ description: 'Template priority' })
  priority: string;

  @ApiProperty({ description: 'Channel configuration', required: false })
  channelConfig?: any;

  @ApiProperty({ description: 'Template version', required: false })
  version?: string;

  @ApiProperty({ description: 'Parent template ID', required: false })
  parentTemplateId?: string;

  @ApiProperty({ description: 'Performance metrics', required: false })
  metrics?: any;

  @ApiProperty({ description: 'Created by user', required: false })
  createdBy?: string;

  @ApiProperty({ description: 'Last updated by user', required: false })
  updatedBy?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

/**
 * Template Filter DTO
 */
export class TemplateFilterDto extends PaginationDto {
  @ApiProperty({ description: 'Filter by channel', required: false })
  @IsOptional()
  @IsString()
  channel?: string;

  @ApiProperty({ description: 'Filter by type', required: false })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ description: 'Filter by merchant ID', required: false })
  @IsOptional()
  @IsUUID()
  merchantId?: string;

  @ApiProperty({ description: 'Filter by language', required: false })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({ description: 'Filter by active status', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: 'Filter by default status', required: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiProperty({ description: 'Search in template name', required: false })
  @IsOptional()
  @IsString()
  search?: string;
}

/**
 * Template Preview DTO
 */
export class PreviewTemplateDto {
  @ApiProperty({ description: 'Template ID to preview' })
  @IsUUID()
  templateId: string;

  @ApiProperty({ description: 'Variables to use for preview', required: false })
  @IsOptional()
  @IsObject()
  variables?: any;

  @ApiProperty({ description: 'Test recipient contact', required: false })
  @IsOptional()
  @IsString()
  testRecipient?: string;
}

/**
 * Template Preview Response DTO
 */
export class TemplatePreviewResponseDto {
  @ApiProperty({ description: 'Rendered subject', required: false })
  subject?: string;

  @ApiProperty({ description: 'Rendered body' })
  body: string;

  @ApiProperty({ description: 'Rendered HTML', required: false })
  html?: string;

  @ApiProperty({ description: 'Variables used in rendering' })
  variables: any;

  @ApiProperty({ description: 'Missing required variables', required: false })
  missingVariables?: string[];

  @ApiProperty({ description: 'Validation errors', required: false })
  validationErrors?: string[];
}

/**
 * Test Template Send DTO
 */
export class TestTemplateSendDto {
  @ApiProperty({ description: 'Template ID to test' })
  @IsUUID()
  templateId: string;

  @ApiProperty({ description: 'Test recipient contact' })
  @IsString()
  testRecipient: string;

  @ApiProperty({ description: 'Variables for template rendering', required: false })
  @IsOptional()
  @IsObject()
  variables?: any;

  @ApiProperty({ description: 'Override channel for testing', required: false })
  @IsOptional()
  @IsIn(['email', 'sms', 'push', 'telegram'])
  testChannel?: string;
}

import { IsString, IsUUID, IsOptional, IsObject, IsIn, IsDateString, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from '../common/pagination.dto';

/**
 * Create Alert DTO
 */
export class CreateAlertDto {
  @ApiProperty({ description: 'Alert type' })
  @IsString()
  alertType: string;

  @ApiProperty({
    description: 'Alert severity',
    enum: ['low', 'medium', 'high', 'critical'],
  })
  @IsString()
  @IsIn(['low', 'medium', 'high', 'critical'])
  severity: string;

  @ApiProperty({ description: 'Alert title/summary' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Detailed alert description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Associated merchant ID', required: false })
  @IsOptional()
  @IsUUID()
  merchantId?: string;

  @ApiProperty({ description: 'Source service that generated the alert', required: false })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiProperty({ description: 'Source entity ID', required: false })
  @IsOptional()
  @IsString()
  sourceId?: string;

  @ApiProperty({ description: 'Alert payload and context data' })
  @IsObject()
  payload: any;

  @ApiProperty({ description: 'Escalation configuration', required: false })
  @IsOptional()
  @IsObject()
  escalationConfig?: any;

  @ApiProperty({ description: 'Alert rule ID that triggered this', required: false })
  @IsOptional()
  @IsString()
  ruleId?: string;

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

/**
 * Update Alert DTO
 */
export class UpdateAlertDto {
  @ApiProperty({
    description: 'Alert status',
    enum: ['active', 'acknowledged', 'resolved', 'suppressed'],
    required: false,
  })
  @IsOptional()
  @IsIn(['active', 'acknowledged', 'resolved', 'suppressed'])
  status?: string;

  @ApiProperty({ description: 'User who acknowledged the alert', required: false })
  @IsOptional()
  @IsString()
  acknowledgedBy?: string;

  @ApiProperty({ description: 'User who resolved the alert', required: false })
  @IsOptional()
  @IsString()
  resolvedBy?: string;

  @ApiProperty({ description: 'Resolution notes', required: false })
  @IsOptional()
  @IsString()
  resolutionNotes?: string;

  @ApiProperty({ description: 'Suppress until timestamp', required: false })
  @IsOptional()
  @IsDateString()
  suppressedUntil?: string;

  @ApiProperty({ description: 'Updated escalation config', required: false })
  @IsOptional()
  @IsObject()
  escalationConfig?: any;

  @ApiProperty({ description: 'Additional metadata updates', required: false })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

/**
 * Alert Response DTO
 */
export class AlertResponseDto {
  @ApiProperty({ description: 'Alert ID' })
  id: string;

  @ApiProperty({ description: 'Alert type' })
  alertType: string;

  @ApiProperty({ description: 'Alert severity' })
  severity: string;

  @ApiProperty({ description: 'Alert title' })
  title: string;

  @ApiProperty({ description: 'Alert description' })
  description: string;

  @ApiProperty({ description: 'Associated merchant ID', required: false })
  merchantId?: string;

  @ApiProperty({ description: 'Source service', required: false })
  source?: string;

  @ApiProperty({ description: 'Source entity ID', required: false })
  sourceId?: string;

  @ApiProperty({ description: 'Alert payload' })
  payload: any;

  @ApiProperty({ description: 'Alert status' })
  status: string;

  @ApiProperty({ description: 'User who acknowledged', required: false })
  acknowledgedBy?: string;

  @ApiProperty({ description: 'Acknowledgement timestamp', required: false })
  acknowledgedAt?: Date;

  @ApiProperty({ description: 'User who resolved', required: false })
  resolvedBy?: string;

  @ApiProperty({ description: 'Resolution timestamp', required: false })
  resolvedAt?: Date;

  @ApiProperty({ description: 'Resolution notes', required: false })
  resolutionNotes?: string;

  @ApiProperty({ description: 'Number of occurrences' })
  occurrenceCount: number;

  @ApiProperty({ description: 'Last occurrence timestamp', required: false })
  lastOccurrenceAt?: Date;

  @ApiProperty({ description: 'Suppressed until timestamp', required: false })
  suppressedUntil?: Date;

  @ApiProperty({ description: 'Escalation configuration', required: false })
  escalationConfig?: any;

  @ApiProperty({ description: 'Whether alert is escalated' })
  isEscalated: boolean;

  @ApiProperty({ description: 'Escalation timestamp', required: false })
  escalatedAt?: Date;

  @ApiProperty({ description: 'Alert rule ID', required: false })
  ruleId?: string;

  @ApiProperty({ description: 'Additional metadata', required: false })
  metadata?: any;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

/**
 * Alert Filter DTO
 */
export class AlertFilterDto extends PaginationDto {
  @ApiProperty({ description: 'Filter by alert type', required: false })
  @IsOptional()
  @IsString()
  alertType?: string;

  @ApiProperty({ description: 'Filter by severity', required: false })
  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'critical'])
  severity?: string;

  @ApiProperty({ description: 'Filter by status', required: false })
  @IsOptional()
  @IsIn(['active', 'acknowledged', 'resolved', 'suppressed'])
  status?: string;

  @ApiProperty({ description: 'Filter by merchant ID', required: false })
  @IsOptional()
  @IsUUID()
  merchantId?: string;

  @ApiProperty({ description: 'Filter by source service', required: false })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiProperty({ description: 'Start date for filtering', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: 'End date for filtering', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ description: 'Filter escalated alerts only', required: false })
  @IsOptional()
  @IsBoolean()
  isEscalated?: boolean;

  @ApiProperty({ description: 'Search in title/description', required: false })
  @IsOptional()
  @IsString()
  search?: string;
}

/**
 * Acknowledge Alert DTO
 */
export class AcknowledgeAlertDto {
  @ApiProperty({ description: 'User acknowledging the alert' })
  @IsString()
  acknowledgedBy: string;

  @ApiProperty({ description: 'Acknowledgement notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Resolve Alert DTO
 */
export class ResolveAlertDto {
  @ApiProperty({ description: 'User resolving the alert' })
  @IsString()
  resolvedBy: string;

  @ApiProperty({ description: 'Resolution notes' })
  @IsString()
  resolutionNotes: string;

  @ApiProperty({ description: 'Whether to suppress similar alerts', required: false })
  @IsOptional()
  @IsBoolean()
  suppressSimilar?: boolean;

  @ApiProperty({ description: 'Suppression duration in hours', required: false })
  @IsOptional()
  @IsNumber()
  suppressionHours?: number;
}

/**
 * Alert Stats DTO
 */
export class AlertStatsDto {
  @ApiProperty({ description: 'Total alerts created' })
  totalAlerts: number;

  @ApiProperty({ description: 'Active alerts' })
  active: number;

  @ApiProperty({ description: 'Acknowledged alerts' })
  acknowledged: number;

  @ApiProperty({ description: 'Resolved alerts' })
  resolved: number;

  @ApiProperty({ description: 'Escalated alerts' })
  escalated: number;

  @ApiProperty({ description: 'Average resolution time in hours' })
  avgResolutionTimeHours: number;

  @ApiProperty({ description: 'Statistics by severity' })
  bySeverity: {
    [severity: string]: {
      total: number;
      active: number;
      resolved: number;
      avgResolutionTimeHours: number;
    };
  };

  @ApiProperty({ description: 'Statistics by alert type' })
  byType: {
    [alertType: string]: {
      total: number;
      active: number;
      resolved: number;
      occurrenceRate: number;
    };
  };

  @ApiProperty({ description: 'Top alert sources' })
  topSources: Array<{
    source: string;
    alertCount: number;
    criticality: string;
  }>;
}

/**
 * Bulk Alert Operations DTO
 */
export class BulkAlertOperationDto {
  @ApiProperty({ description: 'Alert IDs to operate on' })
  @IsUUID(undefined, { each: true })
  alertIds: string[];

  @ApiProperty({
    description: 'Operation to perform',
    enum: ['acknowledge', 'resolve', 'suppress', 'escalate'],
  })
  @IsIn(['acknowledge', 'resolve', 'suppress', 'escalate'])
  operation: string;

  @ApiProperty({ description: 'Operation performed by user' })
  @IsString()
  performedBy: string;

  @ApiProperty({ description: 'Operation notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Operation-specific data', required: false })
  @IsOptional()
  @IsObject()
  operationData?: any;
}

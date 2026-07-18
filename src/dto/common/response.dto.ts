import { ApiProperty } from '@nestjs/swagger';

/**
 * Standard API Response Metadata
 */
export interface ResponseMeta {
  request_id: string;
  timestamp: string;
  processing_time_ms: number;
  api_version: string;
  endpoint: string;
  user_type: string;
  service?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Base Response DTO
 */
export class BaseResponse<T = any> {
  @ApiProperty({ description: 'Request success status' })
  success: boolean;

  @ApiProperty({ description: 'Response message' })
  message: string;

  @ApiProperty({ description: 'Response data', required: false })
  data?: T;

  @ApiProperty({ description: 'Error details', required: false })
  error?: {
    code: string;
    message: string;
    type: string;
    details?: any;
  } | null;

  @ApiProperty({ description: 'Response metadata' })
  meta?: ResponseMeta;

  constructor(
    success: boolean,
    message: string,
    data?: T,
    meta?: ResponseMeta,
    error?: { code: string; message: string; type: string; details?: any } | null,
  ) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.meta = meta;
    this.error = error;
  }
}

/**
 * Success Response DTO
 */
export class SuccessResponse<T = any> extends BaseResponse<T> {
  constructor(data: T, message: string = 'Success', meta?: ResponseMeta) {
    super(true, message, data, meta);
  }
}

/**
 * Error Response DTO
 */
export class ErrorResponse extends BaseResponse {
  constructor(
    error: { code: string; message: string; type: string; details?: any },
    message: string = 'Error occurred',
    meta?: ResponseMeta,
  ) {
    super(false, message, undefined, meta, error);
  }
}

/**
 * Health Check Response DTO
 */
export class HealthCheckResponseDto {
  @ApiProperty({ description: 'Service name' })
  service: string;

  @ApiProperty({ description: 'Service status' })
  status: 'healthy' | 'unhealthy' | 'degraded';

  @ApiProperty({ description: 'Current timestamp' })
  timestamp: string;

  @ApiProperty({ description: 'Service uptime in seconds' })
  uptime: number;

  @ApiProperty({ description: 'Service version' })
  version: string;

  @ApiProperty({ description: 'Environment' })
  environment: string;

  @ApiProperty({ description: 'Health check results for dependencies' })
  checks: {
    database: 'healthy' | 'unhealthy' | 'timeout';
    redis: 'healthy' | 'unhealthy' | 'timeout';
    kafka: 'healthy' | 'unhealthy' | 'timeout';
    aws_ses: 'healthy' | 'unhealthy' | 'timeout' | 'not_configured';
    twilio: 'healthy' | 'unhealthy' | 'timeout' | 'not_configured';
    firebase: 'healthy' | 'unhealthy' | 'timeout' | 'not_configured';
  };

  @ApiProperty({ description: 'Performance metrics' })
  metrics?: {
    memory_usage_mb: number;
    cpu_usage_percent: number;
    active_connections: number;
    requests_per_minute: number;
  };
}

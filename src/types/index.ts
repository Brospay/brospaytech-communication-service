/**
 * Communication Service Types
 * Centralized export of all type definitions
 */

// Webhook types
export * from './webhook';

// Notification types
export * from './notification';

// Template types
export * from './template';

// Event streaming types
export * from './event-stream';

// Environment configuration types
export * from './environment';

// gRPC service types
export * from './grpc';

/**
 * Common utility types
 */
export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface DateRange {
  startDate?: Date;
  endDate?: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta: {
    requestId: string;
    timestamp: string;
    processingTimeMs: number;
    endpoint: string;
    userType: string;
    service: string;
    version: string;
  };
}

export interface ServiceHealth {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: Record<string, 'healthy' | 'unhealthy' | 'timeout' | 'not_configured'>;
  metrics?: {
    memoryUsageMb: number;
    cpuUsagePercent: number;
    activeConnections: number;
    requestsPerMinute: number;
  };
}

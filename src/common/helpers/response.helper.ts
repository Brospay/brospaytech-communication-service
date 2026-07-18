import { BadRequestException } from '@nestjs/common';
import { BaseResponse } from '../../dto/common/response.dto';

/**
 * Helper class for standardized API responses in Communication Service
 */
export class ResponseHelper {
  /**
   * Validate required headers for internal service endpoints
   */
  static validateInternalHeaders(serviceId: string, requestId: string): void {
    if (!serviceId) {
      throw new BadRequestException('x-service-name header is required');
    }
    if (!requestId) {
      throw new BadRequestException('x-request-id header is required');
    }
  }

  /**
   * Validate required parameters
   */
  static validateRequiredParams(params: Record<string, any>): void {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') {
        throw new BadRequestException(`${key} parameter is required`);
      }
    }
  }

  /**
   * Create success response following standardized pattern
   */
  static createSuccessResponse<T>(
    data: T,
    message: string,
    requestId: string,
    endpoint: string,
    startTime: number,
    userType: string = 'internal'
  ): BaseResponse<T> {
    return {
      success: true,
      data,
      message,
      error: null,
      meta: {
        request_id: requestId,
        timestamp: new Date().toISOString(),
        processing_time_ms: Date.now() - startTime,
        api_version: 'v1',
        endpoint,
        user_type: userType,
        service: 'communication',
      },
    };
  }

  /**
   * Create error response following standardized pattern
   */
  static createErrorResponse(
    errorCode: string,
    errorMessage: string,
    errorType: string,
    requestId: string,
    endpoint: string,
    details?: any,
    userType: string = 'internal'
  ): BaseResponse<null> {
    return {
      success: false,
      data: null,
      message: errorMessage,
      error: {
        code: errorCode,
        message: errorMessage,
        type: errorType,
        details,
      },
      meta: {
        request_id: requestId,
        timestamp: new Date().toISOString(),
        processing_time_ms: 0,
        api_version: 'v1',
        endpoint,
        user_type: userType,
        service: 'communication',
      },
    };
  }

  /**
   * Execute service call with automatic error handling and response formatting
   */
  static async executeServiceCall<T>(
    serviceCall: () => Promise<T>,
    requestId: string,
    endpoint: string,
    successMessage: string,
    errorCode: string,
    errorMessage: string = 'Operation failed',
    userType: string = 'internal'
  ): Promise<BaseResponse<T>> {
    const startTime = Date.now();
    
    try {
      const result = await serviceCall();
      return this.createSuccessResponse(result, successMessage, requestId, endpoint, startTime, userType);
    } catch (error) {
      return this.createErrorResponse(
        errorCode,
        errorMessage,
        'service_error',
        requestId,
        endpoint,
        error.message,
        userType
      ) as BaseResponse<T>;
    }
  }

  /**
   * Create gRPC success response with standardized metadata
   */
  static createGrpcSuccessResponse<T>(
    data: T,
    message: string = 'Operation completed successfully'
  ): T & { success: boolean; message?: string } {
    return {
      ...data,
      success: true,
      message,
    };
  }

  /**
   * Create gRPC error response with standardized metadata
   */
  static createGrpcErrorResponse<T extends Record<string, any>>(
    errorMessage: string,
    defaultResponse: T
  ): T & { success: boolean; errorMessage?: string } {
    return {
      ...defaultResponse,
      success: false,
      errorMessage,
    };
  }

  /**
   * Execute gRPC service call with automatic error handling
   */
  static async executeGrpcCall<T extends Record<string, any>>(
    serviceCall: () => Promise<T>,
    defaultErrorResponse: T,
    errorMessage: string = 'gRPC operation failed'
  ): Promise<T & { success: boolean; errorMessage?: string }> {
    try {
      const result = await serviceCall();
      return this.createGrpcSuccessResponse(result);
    } catch (error) {
      return this.createGrpcErrorResponse(
        error.message || errorMessage,
        defaultErrorResponse
      );
    }
  }

  /**
   * Validate webhook signature for security
   */
  static validateWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return signature === `sha256=${expectedSignature}`;
  }

  /**
   * Generate webhook signature for outbound webhooks
   */
  static generateWebhookSignature(payload: string, secret: string): string {
    const crypto = require('crypto');
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return `sha256=${signature}`;
  }

  /**
   * Create paginated response
   */
  static createPaginatedResponse<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
    requestId: string,
    endpoint: string,
    startTime: number,
    message: string = 'Data retrieved successfully'
  ): BaseResponse<T[]> {
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      success: true,
      data,
      message,
      error: null,
      meta: {
        request_id: requestId,
        timestamp: new Date().toISOString(),
        processing_time_ms: Date.now() - startTime,
        api_version: 'v1',
        endpoint,
        user_type: 'internal',
        service: 'communication',
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext,
          hasPrev,
        },
      },
    };
  }
}

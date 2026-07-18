import {
  applyDecorators,
  UseGuards,
  SetMetadata,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { InternalServiceGuard } from '../guards/internal-service.guard';
import { CombinedAuthGuard } from '../guards/combined-auth.guard';

/**
 * Internal API Endpoint - For internal service communication
 * Requires internal service authentication (from API Gateway)
 */
export function InternalApiEndpoint(options: {
  summary: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  responses?: {
    success?: { description: string; type?: any };
    error?: { description: string; status?: number };
  };
}) {
  const decorators = [
    ApiTags(...(options.tags || ['Internal API'])),
    ApiOperation({
      summary: `[INTERNAL] ${options.summary}`,
      description: options.description || `Internal service endpoint: ${options.summary}`,
      operationId: options.operationId,
    }),
    ApiHeader({
      name: 'x-gateway-signature',
      description: 'API Gateway signature for internal authentication',
      required: true,
    }),
    ApiHeader({
      name: 'x-service-name',
      description: 'Source service name',
      required: true,
    }),
    ApiHeader({
      name: 'x-request-id',
      description: 'Unique request identifier',
      required: true,
    }),
    UseGuards(InternalServiceGuard),
  ];

  // Add success response
  if (options.responses?.success) {
    decorators.push(
      ApiResponse({
        status: 200,
        description: options.responses.success.description,
        type: options.responses.success.type,
      })
    );
  }

  // Add error responses
  decorators.push(
    ApiResponse({
      status: 401,
      description: 'Unauthorized - Invalid internal service signature',
    }),
    ApiResponse({
      status: 403,
      description: 'Forbidden - Service not authorized',
    })
  );

  if (options.responses?.error) {
    decorators.push(
      ApiResponse({
        status: options.responses.error.status || 400,
        description: options.responses.error.description,
      })
    );
  }

  return applyDecorators(...decorators);
}

/**
 * Public Endpoint - No authentication required
 * Used for health checks, documentation, etc.
 */
export function PublicApiEndpoint(options: {
  summary: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  responses?: {
    success?: { description: string; type?: any };
    error?: { description: string; status?: number };
  };
}) {
  const decorators = [
    SetMetadata('isPublic', true),
    ApiTags(...(options.tags || ['Public API'])),
    ApiOperation({
      summary: `[PUBLIC] ${options.summary}`,
      description: options.description || `Public endpoint: ${options.summary}`,
      operationId: options.operationId,
    }),
    UseGuards(CombinedAuthGuard),
  ];

  // Add success response
  if (options.responses?.success) {
    decorators.push(
      ApiResponse({
        status: 200,
        description: options.responses.success.description,
        type: options.responses.success.type,
      })
    );
  }

  if (options.responses?.error) {
    decorators.push(
      ApiResponse({
        status: options.responses.error.status || 500,
        description: options.responses.error.description,
      })
    );
  }

  return applyDecorators(...decorators);
}

/**
 * Communication API Endpoint - For communication service endpoints
 * Requires internal service authentication and includes communication-specific headers
 */
export function CommunicationApiEndpoint(options: {
  summary: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  responses?: {
    success?: { description: string; type?: any };
    error?: { description: string; status?: number };
  };
}) {
  const decorators = [
    ApiTags(...(options.tags || ['Communication Service'])),
    ApiOperation({
      summary: options.summary,
      description: options.description || options.summary,
      operationId: options.operationId,
    }),
    ApiHeader({
      name: 'x-gateway-signature',
      description: 'API Gateway signature for internal authentication',
      required: true,
    }),
    ApiHeader({
      name: 'x-service-name',
      description: 'Source service name',
      required: true,
    }),
    ApiHeader({
      name: 'x-request-id',
      description: 'Unique request identifier',
      required: true,
    }),
    UseGuards(InternalServiceGuard),
  ];

  // Add success response
  if (options.responses?.success) {
    decorators.push(
      ApiResponse({
        status: 200,
        description: options.responses.success.description,
        type: options.responses.success.type,
      })
    );
  }

  // Add common error responses
  decorators.push(
    ApiResponse({
      status: 401,
      description: 'Unauthorized - Invalid internal service signature',
    }),
    ApiResponse({
      status: 403,
      description: 'Forbidden - Service not authorized',
    }),
    ApiResponse({
      status: 500,
      description: 'Internal server error',
    })
  );

  if (options.responses?.error) {
    decorators.push(
      ApiResponse({
        status: options.responses.error.status || 400,
        description: options.responses.error.description,
      })
    );
  }

  return applyDecorators(...decorators);
}

/**
 * Decorator to mark endpoints as public (skip authentication)
 */
export const Public = () => SetMetadata('isPublic', true);

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

/**
 * Internal Service Guard
 * Validates requests from API Gateway and other internal services
 */
@Injectable()
export class InternalServiceGuard implements CanActivate {
  private readonly logger = new Logger(InternalServiceGuard.name);
  private readonly internalSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.internalSecret = this.configService.get<string>('INTERNAL_SERVICE_SECRET') || 
      this.configService.get<string>('security.gatewaySecret') ||
      'valorapays-internal-secret-2024';

    if (!this.internalSecret) {
      throw new Error('INTERNAL_SERVICE_SECRET environment variable is required');
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    
    try {
      // Extract internal authentication headers
      const headers = this.extractHeaders(request);
      
      // Validate gateway signature
      if (!this.validateGatewaySignature(headers)) {
        this.logSecurityAlert('Invalid gateway signature', headers, request);
        throw new UnauthorizedException('Unauthorized internal request');
      }
      
      // Validate timestamp (30-second window)
      if (!this.validateTimestamp(headers['x-timestamp'])) {
        this.logSecurityAlert('Request timestamp expired', headers, request);
        throw new UnauthorizedException('Request expired');
      }
      
      // Validate user context
      if (!this.validateUserContext(headers)) {
        this.logSecurityAlert('Invalid user context', headers, request);
        throw new UnauthorizedException('Invalid user context');
      }
      
      // Store authenticated context for use in controllers
      this.setAuthenticatedContext(request, headers);
      
      return true;
    } catch (error) {
      this.logger.error('Internal service authentication failed:', error.message);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  private extractHeaders(request: any): Record<string, string> {
    return {
      'x-gateway-signature': request.headers['x-gateway-signature'] || '',
      'x-service-name': request.headers['x-service-name'] || '',
      'x-request-id': request.headers['x-request-id'] || '',
      'x-timestamp': request.headers['x-timestamp'] || '',
      'x-authenticated-user': request.headers['x-authenticated-user'] || '',
      'x-user-type': request.headers['x-user-type'] || '',
      'x-merchant-id': request.headers['x-merchant-id'] || '',
      'x-user-role': request.headers['x-user-role'] || '',
      'x-source-ip': request.headers['x-source-ip'] || '',
    };
  }

  private validateGatewaySignature(headers: Record<string, string>): boolean {
    const receivedSignature = headers['x-gateway-signature'];
    if (!receivedSignature) {
      return false;
    }

    // Reconstruct signature payload
    const payload = [
      headers['x-authenticated-user'] || 'system',
      headers['x-user-type'] || 'internal',
      headers['x-request-id'],
      headers['x-timestamp'],
      headers['x-source-ip'],
    ].join('|');

    // Generate expected signature
    const expectedSignature = Buffer.from(payload).toString('base64');
    
    return receivedSignature === expectedSignature;
  }

  private validateTimestamp(timestamp: string): boolean {
    if (!timestamp) {
      return false;
    }

    try {
      const requestTime = new Date(timestamp).getTime();
      const currentTime = Date.now();
      const timeDiff = Math.abs(currentTime - requestTime);
      
      // Allow 30-second window
      return timeDiff <= 30000;
    } catch (error) {
      return false;
    }
  }

  private validateUserContext(headers: Record<string, string>): boolean {
    // Service name must be present
    if (!headers['x-service-name']) {
      return false;
    }

    // Request ID must be present
    if (!headers['x-request-id']) {
      return false;
    }

    // Valid service names
    const validServices = [
      'valorapays-api-gateway',
      'valorapays-engine',
      'valorapays-merchant-service',
      'valorapays-wallet-service',
      'valorapays-admin-service',
    ];

    return validServices.includes(headers['x-service-name']);
  }

  private setAuthenticatedContext(request: any, headers: Record<string, string>): void {
    request.authenticatedUser = {
      userId: headers['x-authenticated-user'],
      userType: headers['x-user-type'],
      merchantId: headers['x-merchant-id'],
      role: headers['x-user-role'],
      sourceService: headers['x-service-name'],
    };

    request.requestId = headers['x-request-id'];
    request.clientIp = headers['x-source-ip'];
    request.timestamp = headers['x-timestamp'];
  }

  private logSecurityAlert(reason: string, headers: Record<string, string>, request: any): void {
    this.logger.error(`Security Alert: ${reason}`, {
      reason,
      headers: {
        service: headers['x-service-name'],
        requestId: headers['x-request-id'],
        signature: headers['x-gateway-signature']?.substring(0, 10) + '...',
        timestamp: headers['x-timestamp'],
      },
      request: {
        method: request.method,
        path: request.path,
        ip: request.ip,
        userAgent: request.get('user-agent'),
      },
    });
  }

  /**
   * Static method to check if request is from internal service
   */
  static isInternalRequest(request: any): boolean {
    return !!(
      request.headers['x-gateway-signature'] &&
      request.headers['x-service-name'] &&
      request.headers['x-request-id']
    );
  }
}

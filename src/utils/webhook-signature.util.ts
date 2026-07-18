import * as crypto from 'crypto';
import { Logger } from '@nestjs/common';

const logger = new Logger('WebhookSignatureUtil');

/**
 * Webhook Signature Validation Utilities
 * Handles signature validation for different TSPs (Paytara, Razorpay, Stripe)
 */

/**
 * Validate Paytara webhook signature
 * Paytara uses HMAC-SHA256 with a secret key
 */
export function validatePaytaraSignature(
  payload: string,
  receivedSignature: string,
  secret: string,
): boolean {
  try {
    if (!payload || !receivedSignature || !secret) {
      logger.warn('Missing required parameters for Paytara signature validation');
      return false;
    }

    // Paytara sends signature in format: "sha256=<hash>"
    const expectedSignature = 'sha256=' + crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');

    // Use crypto.timingSafeEqual to prevent timing attacks
    const receivedBuffer = Buffer.from(receivedSignature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

    if (receivedBuffer.length !== expectedBuffer.length) {
      logger.warn('Paytara signature length mismatch');
      return false;
    }

    const isValid = crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
    
    if (!isValid) {
      logger.warn('Paytara signature validation failed');
    } else {
      logger.debug('Paytara signature validation successful');
    }

    return isValid;
  } catch (error) {
    logger.error('Error validating Paytara signature:', error);
    return false;
  }
}

/**
 * Validate Razorpay webhook signature
 * Razorpay uses HMAC-SHA256 with webhook secret
 */
export function validateRazorpaySignature(
  payload: string,
  receivedSignature: string,
  secret: string,
): boolean {
  try {
    if (!payload || !receivedSignature || !secret) {
      logger.warn('Missing required parameters for Razorpay signature validation');
      return false;
    }

    // Razorpay sends signature as hex string
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');

    // Use crypto.timingSafeEqual to prevent timing attacks
    const receivedBuffer = Buffer.from(receivedSignature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (receivedBuffer.length !== expectedBuffer.length) {
      logger.warn('Razorpay signature length mismatch');
      return false;
    }

    const isValid = crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
    
    if (!isValid) {
      logger.warn('Razorpay signature validation failed');
    } else {
      logger.debug('Razorpay signature validation successful');
    }

    return isValid;
  } catch (error) {
    logger.error('Error validating Razorpay signature:', error);
    return false;
  }
}

/**
 * Validate Stripe webhook signature
 * Stripe uses a more complex signature scheme with timestamps
 */
export function validateStripeSignature(
  payload: string,
  receivedSignature: string,
  secret: string,
  tolerance: number = 300, // 5 minutes default tolerance
): boolean {
  try {
    if (!payload || !receivedSignature || !secret) {
      logger.warn('Missing required parameters for Stripe signature validation');
      return false;
    }

    // Parse Stripe signature header
    // Format: "t=<timestamp>,v1=<signature>,v0=<legacy_signature>"
    const elements = receivedSignature.split(',');
    const signatureElements: Record<string, string> = {};

    for (const element of elements) {
      const [key, value] = element.split('=');
      if (key && value) {
        signatureElements[key] = value;
      }
    }

    if (!signatureElements.t || !signatureElements.v1) {
      logger.warn('Invalid Stripe signature format');
      return false;
    }

    const timestamp = parseInt(signatureElements.t, 10);
    const signature = signatureElements.v1;

    // Check timestamp tolerance
    const currentTime = Math.floor(Date.now() / 1000);
    if (Math.abs(currentTime - timestamp) > tolerance) {
      logger.warn('Stripe webhook timestamp outside tolerance window');
      return false;
    }

    // Create expected signature
    const signedPayload = `${timestamp}.${payload}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload, 'utf8')
      .digest('hex');

    // Use crypto.timingSafeEqual to prevent timing attacks
    const receivedBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (receivedBuffer.length !== expectedBuffer.length) {
      logger.warn('Stripe signature length mismatch');
      return false;
    }

    const isValid = crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
    
    if (!isValid) {
      logger.warn('Stripe signature validation failed');
    } else {
      logger.debug('Stripe signature validation successful');
    }

    return isValid;
  } catch (error) {
    logger.error('Error validating Stripe signature:', error);
    return false;
  }
}

/**
 * Generic webhook signature validator
 * Routes to appropriate TSP-specific validator
 */
export function validateWebhookSignature(
  tsp: string,
  payload: string,
  signature: string,
  secret: string,
): boolean {
  switch (tsp.toLowerCase()) {
    case 'paytara':
      return validatePaytaraSignature(payload, signature, secret);
    case 'razorpay':
      return validateRazorpaySignature(payload, signature, secret);
    case 'stripe':
      return validateStripeSignature(payload, signature, secret);
    default:
      logger.warn(`Unknown TSP for signature validation: ${tsp}`);
      return false;
  }
}

/**
 * Extract timestamp from request for replay attack prevention
 */
export function extractRequestTimestamp(headers: Record<string, string>): Date | null {
  try {
    // Check for standard timestamp headers
    const timestampHeader = headers['x-timestamp'] || 
                           headers['timestamp'] || 
                           headers['x-webhook-timestamp'];
    
    if (timestampHeader) {
      const timestamp = parseInt(timestampHeader, 10);
      return new Date(timestamp * 1000);
    }

    // For Stripe, extract from signature
    if (headers['stripe-signature']) {
      const stripeSignature = headers['stripe-signature'];
      const elements = stripeSignature.split(',');
      
      for (const element of elements) {
        const [key, value] = element.split('=');
        if (key === 't' && value) {
          const timestamp = parseInt(value, 10);
          return new Date(timestamp * 1000);
        }
      }
    }

    return null;
  } catch (error) {
    logger.error('Error extracting request timestamp:', error);
    return null;
  }
}

/**
 * Validate request timestamp to prevent replay attacks
 */
export function validateRequestTimestamp(
  timestamp: Date,
  toleranceSeconds: number = 300, // 5 minutes default
): boolean {
  try {
    const now = new Date();
    const diffSeconds = Math.abs(now.getTime() - timestamp.getTime()) / 1000;
    
    const isValid = diffSeconds <= toleranceSeconds;
    
    if (!isValid) {
      logger.warn(`Request timestamp outside tolerance: ${diffSeconds}s > ${toleranceSeconds}s`);
    }
    
    return isValid;
  } catch (error) {
    logger.error('Error validating request timestamp:', error);
    return false;
  }
}

/**
 * Generate webhook signature for outgoing webhooks to merchants
 */
export function generateWebhookSignature(
  payload: string,
  secret: string,
  algorithm: string = 'sha256',
): string {
  try {
    const signature = crypto
      .createHmac(algorithm, secret)
      .update(payload, 'utf8')
      .digest('hex');
    
    return `${algorithm}=${signature}`;
  } catch (error) {
    logger.error('Error generating webhook signature:', error);
    throw new Error('Failed to generate webhook signature');
  }
}

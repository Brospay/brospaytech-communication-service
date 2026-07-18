/**
 * Template Types and Enums
 */

export enum TemplateChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  TELEGRAM = 'telegram',
}

export enum TemplatePriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface TemplateRenderResult {
  subject?: string;
  body: string;
  html?: string;
  variables: any;
  missingVariables?: string[];
  validationErrors?: string[];
}

export interface TemplateMetrics {
  usageCount: number;
  deliveryRate: number;
  openRate?: number; // for email templates
  clickRate?: number; // for email templates
  avgRenderTimeMs: number;
  lastUsedAt?: Date;
}

export interface TemplateValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface TemplatePreview {
  subject?: string;
  body: string;
  html?: string;
  variables: any;
  missingVariables?: string[];
}

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationTemplate } from '../../../entities';
import { TemplateRenderResult, TemplateValidationResult } from '../../../types';
import { RedisConfigService } from '../../../config';
import { TemplateLoaderService } from './template-loader.service';

/**
 * Template Renderer Service
 * Handles template compilation, rendering, and caching using Handlebars
 */
@Injectable()
export class TemplateRendererService {
  private readonly logger = new Logger(TemplateRendererService.name);
  private readonly templateCache = new Map<string, HandlebarsTemplateDelegate>();
  private readonly CACHE_TTL = 3600; // 1 hour cache

  constructor(
    @InjectRepository(NotificationTemplate)
    private readonly templateRepository: Repository<NotificationTemplate>,
    private readonly redisService: RedisConfigService,
    private readonly templateLoader: TemplateLoaderService,
  ) {
    this.registerHandlebarsHelpers();
  }

  /**
   * Render template with variables
   */
  async renderTemplate(
    templateId: string,
    variables: Record<string, any>,
    channel?: string
  ): Promise<TemplateRenderResult> {
    try {
      this.logger.log(`Rendering template ${templateId} for channel ${channel}`);

      // Get template from cache or database
      const template = await this.getTemplate(templateId);
      if (!template) {
        throw new BadRequestException(`Template not found: ${templateId}`);
      }

      // Validate template is active
      if (!template.isActive) {
        throw new BadRequestException(`Template is inactive: ${templateId}`);
      }

      // Check required variables
      const missingVariables = this.checkRequiredVariables(template, variables);
      if (missingVariables.length > 0) {
        this.logger.warn(`Missing required variables for template ${templateId}: ${missingVariables.join(', ')}`);
      }

      // Merge with default variables
      const mergedVariables = {
        ...template.defaultVariables,
        ...variables,
        // Add system variables
        _system: {
          currentDate: new Date().toISOString(),
          currentYear: new Date().getFullYear(),
          timestamp: Date.now(),
        },
      };

      // Render templates
      const result: TemplateRenderResult = {
        variables: mergedVariables,
        missingVariables,
        body: await this.renderTemplateString(template.bodyTemplate, mergedVariables),
      };

      // Render subject if available
      if (template.subjectTemplate) {
        result.subject = await this.renderTemplateString(template.subjectTemplate, mergedVariables);
      }

      // Render HTML if available
      if (template.htmlTemplate) {
        result.html = await this.renderTemplateString(template.htmlTemplate, mergedVariables);
      }

      this.logger.log(`Template ${templateId} rendered successfully`);
      return result;

    } catch (error) {
      this.logger.error(`Failed to render template ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * Get default template for channel and type
   */
  async getDefaultTemplate(
    channel: string,
    type: string,
    merchantId?: string
  ): Promise<NotificationTemplate | null> {
    try {
      // Try merchant-specific template first
      if (merchantId) {
        const merchantTemplate = await this.templateRepository.findOne({
          where: {
            channel,
            type,
            merchantId,
            isActive: true,
            isDefault: true,
          },
        });
        
        if (merchantTemplate) {
          return merchantTemplate;
        }
      }

      // Fall back to system default template
      const systemTemplate = await this.templateRepository.findOne({
        where: {
          channel,
          type,
          merchantId: undefined, // System template
          isActive: true,
          isDefault: true,
        },
      });

      return systemTemplate;

    } catch (error) {
      this.logger.error(`Failed to get default template for ${channel}:${type}:`, error);
      return null;
    }
  }

  /**
   * Validate template syntax
   */
  async validateTemplate(
    templateContent: string,
    requiredVariables?: string[]
  ): Promise<TemplateValidationResult> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Try to compile the template
      try {
        Handlebars.compile(templateContent);
      } catch (error) {
        errors.push(`Handlebars compilation error: ${error.message}`);
      }

      // Check for required variables usage
      if (requiredVariables && requiredVariables.length > 0) {
        for (const variable of requiredVariables) {
          const regex = new RegExp(`{{\\s*${variable}\\s*}}|{{\\s*${variable}\\.`, 'g');
          if (!regex.test(templateContent)) {
            warnings.push(`Required variable '${variable}' is not used in template`);
          }
        }
      }

      // Check for potentially unsafe expressions
      const unsafePatterns = [
        /\{\{\{.*\}\}\}/g, // Triple braces (unescaped)
        /\{\{.*\|.*\}\}/g, // Pipes (potential XSS)
      ];

      unsafePatterns.forEach(pattern => {
        if (pattern.test(templateContent)) {
          warnings.push('Template contains potentially unsafe expressions');
        }
      });

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [`Template validation failed: ${error.message}`],
      };
    }
  }

  /**
   * Clear template cache
   */
  async clearTemplateCache(templateId?: string): Promise<void> {
    if (templateId) {
      this.templateCache.delete(templateId);
      await this.redisService.del(`template:${templateId}`);
      this.logger.log(`Cleared cache for template ${templateId}`);
    } else {
      this.templateCache.clear();
      const pattern = 'template:*';
      const keys = await this.redisService.getClient().keys(pattern);
      if (keys.length > 0) {
        await this.redisService.getClient().del(...keys);
      }
      this.logger.log('Cleared all template cache');
    }
  }

  /**
   * Precompile and cache template
   */
  async precompileTemplate(template: NotificationTemplate): Promise<void> {
    try {
      // Compile body template
      const compiledBody = Handlebars.compile(template.bodyTemplate);
      this.templateCache.set(`${template.id}:body`, compiledBody);

      // Compile subject template if exists
      if (template.subjectTemplate) {
        const compiledSubject = Handlebars.compile(template.subjectTemplate);
        this.templateCache.set(`${template.id}:subject`, compiledSubject);
      }

      // Compile HTML template if exists
      if (template.htmlTemplate) {
        const compiledHtml = Handlebars.compile(template.htmlTemplate);
        this.templateCache.set(`${template.id}:html`, compiledHtml);
      }

      // Cache template data in Redis
      await this.redisService.setex(`template:${template.id}`, this.CACHE_TTL, {
        id: template.id,
        bodyTemplate: template.bodyTemplate,
        subjectTemplate: template.subjectTemplate,
        htmlTemplate: template.htmlTemplate,
        defaultVariables: template.defaultVariables,
        requiredVariables: template.requiredVariables,
        isActive: template.isActive,
      });

      this.logger.log(`Precompiled template ${template.id}`);

    } catch (error) {
      this.logger.error(`Failed to precompile template ${template.id}:`, error);
    }
  }

  /**
   * Get template from cache or database
   */
  private async getTemplate(templateId: string): Promise<NotificationTemplate | null> {
    try {
      // Try Redis cache first
      const cachedTemplate = await this.redisService.get(`template:${templateId}`);
      if (cachedTemplate) {
        return cachedTemplate as NotificationTemplate;
      }

      // Get from database
      const template = await this.templateRepository.findOne({
        where: { id: templateId },
      });

      if (template) {
        // Cache for future use
        await this.precompileTemplate(template);
      }

      return template;

    } catch (error) {
      this.logger.error(`Failed to get template ${templateId}:`, error);
      return null;
    }
  }

  /**
   * Render template string with variables
   */
  private async renderTemplateString(
    templateString: string,
    variables: Record<string, any>
  ): Promise<string> {
    try {
      // Try to get compiled template from cache
      const cacheKey = this.generateCacheKey(templateString);
      let compiled = this.templateCache.get(cacheKey);

      if (!compiled) {
        // Compile and cache
        compiled = Handlebars.compile(templateString);
        this.templateCache.set(cacheKey, compiled);
      }

      // Render with variables
      return compiled(variables);

    } catch (error) {
      this.logger.error('Failed to render template string:', error);
      throw new BadRequestException(`Template rendering failed: ${error.message}`);
    }
  }

  /**
   * Check for missing required variables
   */
  private checkRequiredVariables(
    template: NotificationTemplate,
    variables: Record<string, any>
  ): string[] {
    if (!template.requiredVariables || template.requiredVariables.length === 0) {
      return [];
    }

    const missingVariables: string[] = [];

    for (const requiredVar of template.requiredVariables) {
      if (!this.hasNestedProperty(variables, requiredVar)) {
        missingVariables.push(requiredVar);
      }
    }

    return missingVariables;
  }

  /**
   * Check if object has nested property
   */
  private hasNestedProperty(obj: any, path: string): boolean {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined || !(part in current)) {
        return false;
      }
      current = current[part];
    }

    return true;
  }

  /**
   * Generate cache key for template string
   */
  private generateCacheKey(templateString: string): string {
    // Simple hash function for cache key
    let hash = 0;
    for (let i = 0; i < templateString.length; i++) {
      const char = templateString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `template_${Math.abs(hash)}`;
  }

  /**
   * Register custom Handlebars helpers
   */
  private registerHandlebarsHelpers(): void {
    // Date formatting helper
    Handlebars.registerHelper('formatDate', (date: Date | string, format?: string) => {
      const d = new Date(date);
      if (isNaN(d.getTime())) {
        return 'Invalid Date';
      }

      switch (format) {
        case 'short':
          return d.toLocaleDateString();
        case 'long':
          return d.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
        case 'time':
          return d.toLocaleTimeString();
        case 'datetime':
          return d.toLocaleString();
        default:
          return d.toISOString();
      }
    });

    // Currency formatting helper
    Handlebars.registerHelper('formatCurrency', (amount: number, currency = 'INR') => {
      if (typeof amount !== 'number') {
        return '0';
      }

      const formatters: Record<string, Intl.NumberFormat> = {
        INR: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }),
        USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
        EUR: new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR' }),
      };

      const formatter = formatters[currency] || formatters.INR;
      return formatter.format(amount);
    });

    // Conditional helper
    Handlebars.registerHelper('ifEquals', function(a: any, b: any, options: any) {
      if (a === b) {
        return options.fn(this);
      }
      return options.inverse(this);
    });

    // Capitalize helper
    Handlebars.registerHelper('capitalize', (str: string) => {
      if (typeof str !== 'string') return str;
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    });

    // Truncate helper
    Handlebars.registerHelper('truncate', (str: string, length = 50) => {
      if (typeof str !== 'string') return str;
      return str.length > length ? str.substring(0, length) + '...' : str;
    });

    // Math helper
    Handlebars.registerHelper('math', (a: number, operator: string, b: number) => {
      switch (operator) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/': return a / b;
        case '%': return a % b;
        default: return 0;
      }
    });

    // Default value helper
    Handlebars.registerHelper('default', (value: any, defaultValue: any) => {
      return value || defaultValue;
    });

    this.logger.log('Registered Handlebars helpers');
  }
}

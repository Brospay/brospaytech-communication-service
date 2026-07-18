import { Injectable, Logger } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class TemplateLoaderService {
  private readonly logger = new Logger(TemplateLoaderService.name);
  private readonly templates = new Map<string, HandlebarsTemplateDelegate>();
  // In production (dist), templates are at dist/templates/email (not dist/src/templates/email)
  // __dirname in production is: dist/modules/notification/providers (without src/)
  private readonly templatesPath = path.join(__dirname, '../../../../templates/email');

  constructor() {
    this.loadTemplates();
    this.registerHelpers();
  }

  private loadTemplates(): void {
    try {
      const templateFiles = fs.readdirSync(this.templatesPath);
      
      for (const file of templateFiles) {
        if (file.endsWith('.hbs')) {
          const templateName = file.replace('.hbs', '');
          const templatePath = path.join(this.templatesPath, file);
          const templateContent = fs.readFileSync(templatePath, 'utf-8');
          
          this.templates.set(templateName, Handlebars.compile(templateContent));
          this.logger.log(`Loaded email template: ${templateName}`);
        }
      }
      
      this.logger.log(`Total ${this.templates.size} email templates loaded successfully`);
    } catch (error) {
      this.logger.error(`Failed to load email templates from ${this.templatesPath}: ${error.message}`);
    }
  }

  private registerHelpers(): void {
    Handlebars.registerHelper('eq', (a, b) => a === b);
    Handlebars.registerHelper('ne', (a, b) => a !== b);
    Handlebars.registerHelper('gt', (a, b) => a > b);
    Handlebars.registerHelper('lt', (a, b) => a < b);
    Handlebars.registerHelper('and', (a, b) => a && b);
    Handlebars.registerHelper('or', (a, b) => a || b);
    Handlebars.registerHelper('not', (a) => !a);
    
    Handlebars.registerHelper('formatCurrency', (amount, currency = 'INR') => {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: currency,
      }).format(amount);
    });
    
    Handlebars.registerHelper('formatDate', (date) => {
      return new Date(date).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    });
    
    Handlebars.registerHelper('formatDateTime', (date) => {
      return new Date(date).toLocaleString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    });
  }

  render(templateName: string, data: Record<string, any>): string {
    const template = this.templates.get(templateName);
    
    if (!template) {
      this.logger.warn(`Template not found: ${templateName}, using base template`);
      return this.renderBase(data);
    }

    const templateData = {
      ...data,
      year: new Date().getFullYear(),
      brand_logo_url: process.env.BRAND_LOGO_URL || 'https://dashboard.valorapays.com/assets/logo.svg',
    };

    return template(templateData);
  }

  private renderBase(data: Record<string, any>): string {
    const baseTemplate = this.templates.get('base');
    
    if (!baseTemplate) {
      return `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2>${data.subject || 'Notification'}</h2>
              <p>${data.message || data.content || ''}</p>
            </div>
          </body>
        </html>
      `;
    }

    return baseTemplate({
      ...data,
      year: new Date().getFullYear(),
    });
  }

  hasTemplate(templateName: string): boolean {
    return this.templates.has(templateName);
  }

  getAvailableTemplates(): string[] {
    return Array.from(this.templates.keys());
  }
}


import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { join } from 'path';

/**
 * Database Configuration Service
 * Provides TypeORM configuration for PostgreSQL
 */
@Injectable()
export class DatabaseConfigService implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      type: 'postgres',
      host: this.configService.get<string>('database.host'),
      port: this.configService.get<number>('database.port'),
      username: this.configService.get<string>('database.username'),
      password: this.configService.get<string>('database.password'),
      database: this.configService.get<string>('database.name'),
      entities: [join(__dirname, '../**/*.entity{.ts,.js}')],
      migrations: [join(__dirname, '../migrations/*{.ts,.js}')],
      synchronize: this.configService.get<boolean>('database.synchronize'),
      logging: this.configService.get<boolean>('database.logging'),
      ssl: this.configService.get<boolean>('database.ssl'),
      extra: {
        connectionLimit: 25,
        acquireTimeout: 60000,
        timeout: 60000,
      },
      retryAttempts: 5,
      retryDelay: 3000,
    };
  }
}

import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

export interface ServiceConfigOptions {
  serviceName: string;
  port: number;
}

@Module({})
export class SharedConfigModule {
  static forService(options: ServiceConfigOptions): DynamicModule {
    return {
      module: SharedConfigModule,
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          cache: true,
          validationSchema: Joi.object({
            NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
            PORT: Joi.number().port().default(options.port),
            SERVICE_NAME: Joi.string().default(options.serviceName),
            DATABASE_URL: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }).required(),
            JWT_ISSUER: Joi.string().required(),
            JWT_AUDIENCE: Joi.string().required(),
            JWT_PRIVATE_KEY: Joi.string().required(),
            JWT_PUBLIC_KEY: Joi.string().required(),
            JWT_EXPIRES_IN: Joi.string().default('15m'),
            INTERNAL_SHARED_SECRET: Joi.string().min(32).required(),
            INTERNAL_JWT_SECRET: Joi.string().min(32).required(),
            AUTH_SERVICE_URL: Joi.string().uri().default('http://auth-service:3001'),
            TRANSACTION_SERVICE_URL: Joi.string().uri().default('http://transaction-service:3002'),
            AUDIT_SERVICE_URL: Joi.string().uri().default('http://audit-service:3003'),
            OTEL_EXPORTER_OTLP_ENDPOINT: Joi.string().allow('').optional(),
          }),
        }),
      ],
      exports: [ConfigModule],
    };
  }
}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        PORT: Joi.number().port().default(3000),
        SERVICE_ID: Joi.string().default('transactions-service'),
        JWT_ISSUER: Joi.string().required(),
        JWT_AUDIENCE: Joi.string().required(),
        JWT_PUBLIC_KEY: Joi.string().required(),
        SERVICE_MESH_SHARED_SECRET: Joi.string().min(32).required(),
        AUDIT_LOG_PATH: Joi.string().default('logs/audit.log'),
        TLS_CERT_PATH: Joi.string().optional(),
        TLS_KEY_PATH: Joi.string().optional(),
      }),
    }),
  ],
})
export class ServiceConfigModule {}

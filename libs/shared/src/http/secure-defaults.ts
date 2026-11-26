import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';

export function applySecureDefaults(app: INestApplication): void {
  const config = app.get(ConfigService);
  const configuredOrigins = config.get<string>('CORS_ALLOWED_ORIGINS', '');
  const allowedOrigins = configuredOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin:
      allowedOrigins.length > 0
        ? (origin, callback) => {
            callback(null, !origin || allowedOrigins.includes(origin));
          }
        : false,
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'Idempotency-Key',
      'X-Request-ID',
      'X-Trace-ID',
    ],
    exposedHeaders: ['X-Request-ID', 'X-Trace-ID'],
    credentials: true,
    maxAge: 600,
  });
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
}

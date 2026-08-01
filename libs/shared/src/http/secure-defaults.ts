import { INestApplication } from '@nestjs/common';
import helmet from 'helmet';

export function applySecureDefaults(app: INestApplication): void {
  app.enableCors();
  app.use(helmet());
}

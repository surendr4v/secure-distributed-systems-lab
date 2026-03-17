import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { ReservationModule } from './reservation.module';
import { SecurityModule } from '../../transactions/src/security/security.module';
import { AuditModule } from '../../transactions/src/audit/audit.module';

async function bootstrap() {
  const app = await NestFactory.create(ReservationModule, {
    logger: ['log', 'error', 'warn'],
  });
  app.use(helmet());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
  await app.listen(3002);
  console.log(`Reservation Service listening on ${await app.getUrl()}`);
}
bootstrap();

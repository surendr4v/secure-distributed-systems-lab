import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const httpsOptions = resolveHttpsOptions();
  const app = await NestFactory.create(AppModule, { httpsOptions });
  const config = app.get(ConfigService);

  app.use(helmet());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();
  app.setGlobalPrefix('api');

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  const url = await app.getUrl();
  console.log(`Secure Financial Transaction Microservice listening on ${url}`);
}

function resolveHttpsOptions() {
  const certPath = process.env.TLS_CERT_PATH;
  const keyPath = process.env.TLS_KEY_PATH;
  if (certPath && keyPath && existsSync(certPath) && existsSync(keyPath)) {
    return {
      cert: readFileSync(certPath),
      key: readFileSync(keyPath),
    };
  }
  return undefined;
}

bootstrap();

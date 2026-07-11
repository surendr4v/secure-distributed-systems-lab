import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { applySecureDefaults, initOtel } from '@shared/index';

async function bootstrap(): Promise<void> {
  await initOtel();
  const app = await NestFactory.create(AppModule);
  applySecureDefaults(app);
  app.setGlobalPrefix('api');
  const config = app.get(ConfigService);
  await app.listen(config.get<number>('PORT', 3001));
}

void bootstrap();

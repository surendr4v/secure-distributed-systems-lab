import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
  const url = await app.getUrl();
  // Log ready URL to help during local bring-up
  console.log(`Secure Financial Transaction Microservice listening on ${url}`);
}

bootstrap();

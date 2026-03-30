import { NestFactory } from '@nestjs/core';
import { GatewayModule } from './gateway.module';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(GatewayModule);
  app.use(helmet());
  await app.listen(3001);
  console.log(`API Gateway listening on ${await app.getUrl()}`);
}
bootstrap();

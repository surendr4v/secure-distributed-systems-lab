import { Controller, Get, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import * as request from 'supertest';

@Controller()
class PingController {
  @Get('ping')
  ping() {
    return { ok: true };
  }
}

/**
 * Verifies the rate-limiting behaviour used by RateLimitModule: a small
 * window/limit is configured and the request past the limit is rejected
 * with HTTP 429.
 */
describe('Rate limiting (ThrottlerGuard)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 2 }])],
      controllers: [PingController],
      providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows requests up to the limit and returns 429 after', async () => {
    await request(app.getHttpServer()).get('/ping').expect(200);
    await request(app.getHttpServer()).get('/ping').expect(200);
    await request(app.getHttpServer()).get('/ping').expect(429);
  });
});

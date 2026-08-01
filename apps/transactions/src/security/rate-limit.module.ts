import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

/**
 * Global API rate limiting.
 *
 * Applies a per-client request quota (keyed by IP by default) across every
 * route as an APP_GUARD, mitigating brute-force and replay/abuse traffic
 * called out in the threat model. Limits are config-driven:
 *   THROTTLE_TTL   - window length in seconds (default 60)
 *   THROTTLE_LIMIT - max requests per window   (default 100)
 *
 * Individual routes can tighten or relax this with the `@Throttle()` /
 * `@SkipThrottle()` decorators from @nestjs/throttler.
 */
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('THROTTLE_TTL', 60) * 1000,
          limit: config.get<number>('THROTTLE_LIMIT', 100),
        },
      ],
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class RateLimitModule {}

import { Module } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { SecurityService } from './security.service';
import { RolesGuard } from './roles.guard';
import { ZeroTrustGuard } from './zero-trust.guard';

@Module({
  providers: [
    SecurityService,
    Reflector,
    { provide: APP_GUARD, useClass: ZeroTrustGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [SecurityService],
})
export class SecurityModule {}

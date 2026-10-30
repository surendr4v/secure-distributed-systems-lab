import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { SecurityService } from './security.service';
import { AuthVerifierService } from './auth-verifier.service';
import { InternalOnlyGuard } from './internal-only.guard';
import { RolesGuard } from './roles.guard';
import { ZeroTrustGuard } from './zero-trust.guard';

@Module({
  imports: [ConfigModule],
  providers: [
    SecurityService,
    AuthVerifierService,
    Reflector,
    { provide: APP_GUARD, useClass: ZeroTrustGuard },
    { provide: APP_GUARD, useClass: InternalOnlyGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [SecurityService, AuthVerifierService],
})
export class SecurityModule {}

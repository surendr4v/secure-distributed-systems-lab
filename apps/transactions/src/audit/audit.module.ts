import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from './audit.interceptor';
import { AuditService } from './audit.service';
import { OutboxService } from './outbox.service';

@Module({
  providers: [
    AuditService,
    OutboxService,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
  exports: [AuditService, OutboxService],
})
export class AuditModule {}

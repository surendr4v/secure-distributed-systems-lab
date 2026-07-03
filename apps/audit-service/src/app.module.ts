import { Module } from '@nestjs/common';
import { DatabaseModule, SecurityModule, SharedConfigModule } from '@shared/index';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { SystemController } from './system.controller';

@Module({
  imports: [
    SharedConfigModule.forService({ serviceName: 'audit-service', port: 3003 }),
    DatabaseModule,
    SecurityModule,
  ],
  controllers: [AuditController, SystemController],
  providers: [AuditService],
})
export class AppModule {}

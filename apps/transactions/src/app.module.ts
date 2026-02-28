import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './audit/audit.module';
import { ServiceConfigModule } from './config/config.module';
import { SecurityModule } from './security/security.module';
import { TransactionModule } from './transactions/transaction.module';

@Module({
  imports: [
    ServiceConfigModule,
    SecurityModule,
    AuditModule,
    TransactionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

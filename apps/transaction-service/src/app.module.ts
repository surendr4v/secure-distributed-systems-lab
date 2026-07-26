import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule, SecurityModule, SharedConfigModule } from '@shared/index';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { TransactionRepository } from './transaction.repository';
import { SystemController } from './system.controller';

@Module({
  imports: [
    SharedConfigModule.forService({ serviceName: 'transaction-service', port: 3002 }),
    ConfigModule,
    DatabaseModule,
    SecurityModule,
  ],
  controllers: [TransactionController, SystemController],
  providers: [TransactionService, TransactionRepository],
})
export class AppModule {}

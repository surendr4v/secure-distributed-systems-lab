import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateTransactionDto, UpdateTransactionStatusDto } from './dto';
import { TransactionRepository } from './transaction.repository';
import { TransactionRecord } from './types';

@Injectable()
export class TransactionService {
  private readonly auditUrl: string;
  private readonly sharedSecret: string;

  constructor(private readonly repository: TransactionRepository, config: ConfigService) {
    this.auditUrl = config.get<string>('AUDIT_SERVICE_URL', 'http://audit-service:3003');
    this.sharedSecret = config.getOrThrow<string>('INTERNAL_SHARED_SECRET');
  }

  async create(input: CreateTransactionDto, principalId: string, idempotencyKey: string): Promise<TransactionRecord> {
    const transaction = await this.repository.create(input, principalId, idempotencyKey);
    await this.emitAudit('TRANSACTION_CREATED', principalId, `/transactions/${transaction.id}`, {
      transactionId: transaction.id,
      status: transaction.status,
    });
    return transaction;
  }

  list(limit: number): Promise<TransactionRecord[]> {
    return this.repository.list(limit);
  }

  async getById(id: string): Promise<TransactionRecord> {
    const tx = await this.repository.getById(id);
    if (!tx) {
      throw new NotFoundException('Transaction not found');
    }
    return tx;
  }

  async updateStatus(id: string, input: UpdateTransactionStatusDto, principalId: string): Promise<TransactionRecord> {
    const tx = await this.repository.updateStatus(id, input.status);
    if (!tx) {
      throw new NotFoundException('Transaction not found');
    }
    await this.emitAudit('TRANSACTION_STATUS_UPDATED', principalId, `/transactions/${tx.id}`, {
      transactionId: tx.id,
      status: tx.status,
    });
    return tx;
  }

  private async emitAudit(eventType: string, actor: string, resource: string, payload: Record<string, unknown>): Promise<void> {
    try {
      await fetch(`${this.auditUrl}/api/audit-events`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-service-name': 'transaction-service',
          'x-service-secret': this.sharedSecret,
        },
        body: JSON.stringify({ eventType, actor, resource, payload }),
      });
    } catch {
      // Intentionally swallow to avoid breaking primary flow when audit sink is unavailable.
    }
  }
}

import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { CreateTransactionDto } from './dto';

export interface TransactionRecord {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
  traceId?: string;
  idempotencyKey?: string;
  payload: CreateTransactionDto;
}

@Injectable()
export class TransactionService {
  private readonly inMemoryLedger: Map<string, TransactionRecord> = new Map();
  private readonly idempotencyIndex: Map<string, string> = new Map();

  submit(
    dto: CreateTransactionDto,
    traceId?: string,
    idempotencyKey?: string,
  ): TransactionRecord {
    const normalizedKey = idempotencyKey?.trim();
    if (normalizedKey) {
      const existingId = this.idempotencyIndex.get(normalizedKey);
      if (existingId) {
        const existing = this.inMemoryLedger.get(existingId);
        if (existing) {
          return existing;
        }
      }
    }

    const now = new Date().toISOString();
    const record: TransactionRecord = {
      id: uuid(),
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      traceId,
      idempotencyKey: normalizedKey,
      payload: dto,
    };
    this.inMemoryLedger.set(record.id, record);
    if (normalizedKey) {
      this.idempotencyIndex.set(normalizedKey, record.id);
    }
    return record;
  }

  approve(id: string): TransactionRecord | undefined {
    const record = this.inMemoryLedger.get(id);
    if (!record) return undefined;
    record.status = 'approved';
    record.updatedAt = new Date().toISOString();
    return record;
  }

  findOne(id: string): TransactionRecord | undefined {
    return this.inMemoryLedger.get(id);
  }

  findByIdempotencyKey(idempotencyKey: string): TransactionRecord | undefined {
    const recordId = this.idempotencyIndex.get(idempotencyKey.trim());
    if (!recordId) {
      return undefined;
    }
    return this.inMemoryLedger.get(recordId);
  }
}

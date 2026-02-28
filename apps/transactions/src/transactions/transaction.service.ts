import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { CreateTransactionDto } from './dto';

export interface TransactionRecord {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
  traceId?: string;
  payload: CreateTransactionDto;
}

@Injectable()
export class TransactionService {
  private readonly inMemoryLedger: Map<string, TransactionRecord> = new Map();

  submit(dto: CreateTransactionDto, traceId?: string): TransactionRecord {
    const now = new Date().toISOString();
    const record: TransactionRecord = {
      id: uuid(),
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      traceId,
      payload: dto,
    };
    this.inMemoryLedger.set(record.id, record);
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
}

import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { OutboxService } from '../audit/outbox.service';
import { ApproveTransactionDto, CreateTransactionDto } from './dto';

export interface TransactionRecord {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
  traceId?: string;
  idempotencyKey?: string;
  version: number;
  createdBy?: string;
  approvedBy?: string;
  payload: CreateTransactionDto;
}

@Injectable()
export class TransactionService {
  private static readonly MAX_RECORDS = 5000;
  private static readonly TTL_MS = 60 * 60 * 1000;

  private readonly inMemoryLedger: Map<string, TransactionRecord> = new Map();
  private readonly idempotencyIndex: Map<string, string> = new Map();

  constructor(private readonly outbox: OutboxService) {}

  submit(
    dto: CreateTransactionDto,
    traceId?: string,
    idempotencyKey?: string,
    createdBy?: string,
  ): TransactionRecord {
    this.pruneExpiredRecords();

    const normalizedKey = idempotencyKey?.trim();
    const existing = this.getExistingByIdempotencyKey(normalizedKey);
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const record: TransactionRecord = {
      id: uuid(),
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      traceId,
      idempotencyKey: normalizedKey || undefined,
      version: 1,
      createdBy: createdBy?.trim() || undefined,
      payload: dto,
    };

    this.inMemoryLedger.set(record.id, record);
    if (normalizedKey) {
      this.idempotencyIndex.set(normalizedKey, record.id);
    }

    this.outbox.enqueue({
      eventType: 'TRANSACTION_CREATED',
      actor: createdBy || 'system',
      resource: `/transactions/${record.id}`,
      payload: {
        transactionId: record.id,
        status: record.status,
        amount: record.payload.amount,
      },
    });

    this.evictOldestIfNeeded();
    return record;
  }

  approve(
    id: string,
    approveDto: ApproveTransactionDto = {},
  ): TransactionRecord | undefined {
    this.pruneExpiredRecords();
    const record = this.requireRecord(id);
    const approverId = approveDto.approverId?.trim();
    const expectedVersion = approveDto.expectedVersion ?? record.version;

    this.assertNotSelfApproval(record, approverId);
    this.assertVersionMatches(record, expectedVersion);

    record.status = 'approved';
    record.approvedBy = approverId;
    record.version += 1;
    record.updatedAt = new Date().toISOString();

    this.outbox.enqueue({
      eventType: 'TRANSACTION_APPROVED',
      actor: approverId || 'system',
      resource: `/transactions/${record.id}`,
      payload: {
        transactionId: record.id,
        status: record.status,
        approvedBy: approverId,
        version: record.version,
      },
    });

    return record;
  }

  findOne(id: string): TransactionRecord | undefined {
    this.pruneExpiredRecords();
    return this.inMemoryLedger.get(id);
  }

  findByIdempotencyKey(idempotencyKey: string): TransactionRecord | undefined {
    this.pruneExpiredRecords();
    const normalizedKey = idempotencyKey?.trim();
    if (!normalizedKey) {
      return undefined;
    }

    const recordId = this.idempotencyIndex.get(normalizedKey);
    if (!recordId) {
      return undefined;
    }

    return this.inMemoryLedger.get(recordId);
  }

  private getExistingByIdempotencyKey(
    idempotencyKey?: string,
  ): TransactionRecord | undefined {
    if (!idempotencyKey) {
      return undefined;
    }

    return this.findByIdempotencyKey(idempotencyKey);
  }

  private requireRecord(id: string): TransactionRecord {
    const record = this.inMemoryLedger.get(id);
    if (!record) {
      throw new Error(`Transaction ${id} not found`);
    }
    return record;
  }

  private assertNotSelfApproval(
    record: TransactionRecord,
    approverId?: string,
  ): void {
    if (approverId && record.createdBy && approverId === record.createdBy) {
      throw new Error('Self-approval is not allowed');
    }
  }

  private assertVersionMatches(
    record: TransactionRecord,
    expectedVersion?: number,
  ): void {
    if (expectedVersion === undefined) {
      return;
    }

    if (expectedVersion !== record.version) {
      throw new Error(
        `Approval rejected: resource state changed. Expected version ${expectedVersion}, current version ${record.version}`,
      );
    }
  }

  private pruneExpiredRecords(): void {
    const now = Date.now();

    for (const [id, record] of this.inMemoryLedger.entries()) {
      const lastTouched = new Date(record.updatedAt).getTime();
      if (Number.isNaN(lastTouched)) {
        this.deleteRecord(id);
        continue;
      }

      if (now - lastTouched > TransactionService.TTL_MS) {
        this.deleteRecord(id);
      }
    }
  }

  private evictOldestIfNeeded(): void {
    if (this.inMemoryLedger.size <= TransactionService.MAX_RECORDS) {
      return;
    }

    const oldestEntries = [...this.inMemoryLedger.entries()].sort(
      ([, left], [, right]) =>
        new Date(left.updatedAt).getTime() -
        new Date(right.updatedAt).getTime(),
    );

    const excess = this.inMemoryLedger.size - TransactionService.MAX_RECORDS;
    for (let i = 0; i < excess; i += 1) {
      const [id] = oldestEntries[i];
      if (id) {
        this.deleteRecord(id);
      }
    }
  }

  private deleteRecord(id: string): void {
    const record = this.inMemoryLedger.get(id);
    if (record?.idempotencyKey) {
      this.idempotencyIndex.delete(record.idempotencyKey);
    }
    this.inMemoryLedger.delete(id);
  }
}

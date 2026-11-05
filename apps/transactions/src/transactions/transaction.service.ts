import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
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
  private readonly inMemoryLedger: Map<string, TransactionRecord> = new Map();
  private readonly idempotencyIndex: Map<string, string> = new Map();

  submit(
    dto: CreateTransactionDto,
    traceId?: string,
    idempotencyKey?: string,
    createdBy?: string,
  ): TransactionRecord {
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

    return record;
  }

  approve(
    id: string,
    approveDto: ApproveTransactionDto = {},
  ): TransactionRecord | undefined {
    const record = this.requireRecord(id);
    const approverId = approveDto.approverId?.trim();
    const expectedVersion = approveDto.expectedVersion ?? record.version;

    this.assertNotSelfApproval(record, approverId);
    this.assertVersionMatches(record, expectedVersion);

    record.status = 'approved';
    record.approvedBy = approverId;
    record.version += 1;
    record.updatedAt = new Date().toISOString();

    return record;
  }

  findOne(id: string): TransactionRecord | undefined {
    return this.inMemoryLedger.get(id);
  }

  findByIdempotencyKey(idempotencyKey: string): TransactionRecord | undefined {
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
}

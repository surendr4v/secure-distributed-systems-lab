import { BadRequestException, ConflictException } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto } from './dto';

describe('TransactionService', () => {
  const service = new TransactionService();
  const payload: CreateTransactionDto = {
    fromAccount: 'acct-1',
    toAccount: 'acct-2',
    amount: 10,
    currency: 'USD',
    purpose: 'test',
  };

  it('submits a transaction with pending status', () => {
    const record = service.submit(payload, 'trace-123');
    expect(record.status).toBe('pending');
    expect(record.payload.amount).toBe(10);
    expect(record.traceId).toBe('trace-123');
  });

  it('returns the same transaction for an identical idempotent replay', () => {
    const first = service.submit(payload, 'trace-1', 'idem-replay');
    const replay = service.submit(payload, 'trace-2', 'idem-replay');

    expect(replay.id).toBe(first.id);
    expect(replay.traceId).toBe('trace-1');
  });

  it('rejects reuse of an idempotency key for different request data', () => {
    service.submit(payload, undefined, 'idem-conflict');

    expect(() =>
      service.submit({ ...payload, amount: 20 }, undefined, 'idem-conflict'),
    ).toThrow(ConflictException);
  });

  it('rejects malformed idempotency keys', () => {
    expect(() => service.submit(payload, undefined, 'invalid key')).toThrow(
      BadRequestException,
    );
  });

  it('approves an existing transaction', () => {
    const record = service.submit(
      payload,
      undefined,
      undefined,
      'user-creator',
    );
    const approved = service.approve(record.id, {
      approverId: 'user-approver',
      expectedVersion: 1,
    });
    expect(approved?.status).toBe('approved');
    expect(approved?.approvedBy).toBe('user-approver');
  });

  it('rejects self-approval', () => {
    const record = service.submit(
      payload,
      undefined,
      undefined,
      'user-creator',
    );
    expect(() =>
      service.approve(record.id, {
        approverId: 'user-creator',
        expectedVersion: 1,
      }),
    ).toThrow('Self-approval is not allowed');
  });

  it('rejects stale approval attempts based on resource version', () => {
    const record = service.submit(
      payload,
      undefined,
      undefined,
      'user-creator',
    );
    expect(() =>
      service.approve(record.id, {
        approverId: 'user-approver',
        expectedVersion: 99,
      }),
    ).toThrow('Approval rejected: resource state changed');
  });
});

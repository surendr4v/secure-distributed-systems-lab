import { BadRequestException, ConflictException } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto } from './dto';
import { OutboxService } from '../audit/outbox.service';

describe('TransactionService', () => {
  const payload: CreateTransactionDto = {
    fromAccount: 'acct-1',
    toAccount: 'acct-2',
    amount: 10,
    currency: 'USD',
    purpose: 'test',
  };

  let service: TransactionService;

  beforeEach(() => {
    service = new TransactionService();
  });

  it('submits a transaction with pending status', () => {
    const record = service.submit(payload, 'trace-123');
    expect(record.status).toBe('pending');
    expect(record.payload.amount).toBe(10);
    expect(record.traceId).toBe('trace-123');
  });

  it('trims createdBy and enqueues a creation event', () => {
    const outbox = new OutboxService();
    service = new TransactionService(outbox);

    const record = service.submit(payload, undefined, 'key-1', '  creator  ');

    expect(record.createdBy).toBe('creator');
    expect(outbox.getStats()).toEqual({ count: 1, pending: 1, sent: 0 });
  });

  it('returns the same transaction for an identical idempotent replay', () => {
    const first = service.submit(payload, 'trace-1', 'idem-replay');
    const replay = service.submit(payload, 'trace-2', 'idem-replay');

    expect(replay.id).toBe(first.id);
    expect(replay.traceId).toBe('trace-1');
  });

  it('looks up transactions and idempotency keys', () => {
    const record = service.submit(payload, undefined, 'lookup-key');

    expect(service.findOne(record.id)).toBe(record);
    expect(service.findByIdempotencyKey(' lookup-key ')).toBe(record);
    expect(service.findByIdempotencyKey('missing')).toBeUndefined();
    expect(service.findByIdempotencyKey('')).toBeUndefined();
    expect(service.findOne('missing')).toBeUndefined();
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
    expect(() => service.submit(payload, undefined, 'a'.repeat(129))).toThrow(
      'exceeds 128 characters',
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

  it('uses the current version when expectedVersion is omitted', () => {
    const record = service.submit(payload);
    const approved = service.approve(record.id, { approverId: '  approver  ' });

    expect(approved?.version).toBe(2);
    expect(approved?.approvedBy).toBe('approver');
  });

  it('supports approval without an explicit approver and enqueues the event', () => {
    const outbox = new OutboxService();
    service = new TransactionService(outbox);
    const record = service.submit(payload);

    const approved = service.approve(record.id);

    expect(approved?.status).toBe('approved');
    expect(approved?.approvedBy).toBeUndefined();
    expect(outbox.getStats()).toEqual({ count: 2, pending: 2, sent: 0 });
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

  it('throws for approval of an unknown transaction', () => {
    expect(() => service.approve('missing')).toThrow(
      'Transaction missing not found',
    );
  });

  it('prunes expired and invalid records and removes their idempotency keys', () => {
    const expired = service.submit(payload, undefined, 'expired-key');
    (expired as any).updatedAt = new Date(
      Date.now() - 61 * 60 * 1000,
    ).toISOString();

    const invalid = service.submit(payload, undefined, 'invalid-key');
    (invalid as any).updatedAt = 'not-a-date';

    service.findOne('missing');

    expect(service.findOne(expired.id)).toBeUndefined();
    expect(service.findByIdempotencyKey('expired-key')).toBeUndefined();
    expect(service.findOne(invalid.id)).toBeUndefined();
    expect(service.findByIdempotencyKey('invalid-key')).toBeUndefined();
  });

  it('evicts the oldest records when the ledger exceeds the limit', () => {
    for (let i = 0; i < 5001; i += 1) {
      service.submit(
        { ...payload, purpose: `record-${i}` },
        undefined,
        `key-${i}`,
      );
    }

    expect((service as any).inMemoryLedger.size).toBe(5000);
  });
});

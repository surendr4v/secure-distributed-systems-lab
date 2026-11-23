import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto } from './dto';

describe('TransactionController', () => {
  const payload: CreateTransactionDto = {
    fromAccount: 'acct-1',
    toAccount: 'acct-2',
    amount: 10,
    currency: 'USD',
    purpose: 'test',
  };

  let service: TransactionService;
  let controller: TransactionController;

  beforeEach(() => {
    service = new TransactionService();
    controller = new TransactionController(service);
  });

  it('returns a stored transaction by id', () => {
    const created = controller.create(payload, { headers: {} });
    const found = controller.getOne(created.id);
    expect(found.id).toBe(created.id);
  });

  it('uses trace and idempotency headers and user actor identity', () => {
    const created = controller.create(payload, {
      headers: {
        'x-request-id': 'request-1',
        'x-idempotency-key': 'idem-1',
      },
      user: { sub: 'user-1' },
    });

    expect(created.traceId).toBe('request-1');
    expect(created.idempotencyKey).toBe('idem-1');
    expect(created.createdBy).toBe('user-1');
  });

  it('prefers x-trace-id, email actor, and the alternate idempotency header', () => {
    const created = controller.create(payload, {
      headers: {
        'x-trace-id': 'trace-1',
        'x-request-id': 'request-1',
        'idempotency-key': 'idem-2',
      },
      user: { email: 'user@example.com' },
    });

    expect(created.traceId).toBe('trace-1');
    expect(created.idempotencyKey).toBe('idem-2');
    expect(created.createdBy).toBe('user@example.com');
  });

  it('uses a service principal as the actor', () => {
    const created = controller.create(payload, {
      headers: {},
      servicePrincipal: { service: 'gateway' },
    });

    expect(created.createdBy).toBe('gateway');
  });

  it('rejects array-valued idempotency headers', () => {
    expect(() =>
      controller.create(payload, {
        headers: { 'x-idempotency-key': ['one', 'two'] },
      }),
    ).toThrow(BadRequestException);
  });

  it('throws 404 NotFoundException for an unknown id', () => {
    expect(() => controller.getOne('does-not-exist')).toThrow(
      NotFoundException,
    );
  });

  it('approves a transaction using the user principal', () => {
    const created = controller.create(payload, { headers: {} });
    const approved = controller.approve(
      created.id,
      {},
      {
        user: { sub: 'approver-1' },
      },
    );

    expect(approved.status).toBe('approved');
    expect(approved.approvedBy).toBe('approver-1');
  });

  it('uses body approverId and service principal fallback', () => {
    const created = controller.create(payload, { headers: {} });
    const approved = controller.approve(
      created.id,
      { approverId: 'body-user' },
      {
        servicePrincipal: { service: 'mesh-service' },
      },
    );

    expect(approved.approvedBy).toBe('body-user');
  });

  it('uses service principal as approver fallback', () => {
    const created = controller.create(payload, { headers: {} });
    const approved = controller.approve(
      created.id,
      {},
      {
        servicePrincipal: { service: 'mesh-service' },
      },
    );

    expect(approved.approvedBy).toBe('mesh-service');
  });

  it('converts approval errors to BadRequestException', () => {
    expect(() => controller.approve('missing', {}, {})).toThrow(
      BadRequestException,
    );
  });

  it('returns approval NotFoundException for a missing record', () => {
    jest.spyOn(service, 'approve').mockReturnValue(undefined);

    expect(() => controller.approve('missing', {}, {})).toThrow(
      NotFoundException,
    );
  });
});

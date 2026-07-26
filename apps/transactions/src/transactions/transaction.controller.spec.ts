import { NotFoundException } from '@nestjs/common';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto } from './dto';

describe('TransactionController', () => {
  const service = new TransactionService();
  const controller = new TransactionController(service);
  const payload: CreateTransactionDto = {
    fromAccount: 'acct-1',
    toAccount: 'acct-2',
    amount: 10,
    currency: 'USD',
    purpose: 'test',
  };

  it('returns a stored transaction by id', () => {
    const created = controller.create(payload, { headers: {} });
    const found = controller.getOne(created.id);
    expect(found.id).toBe(created.id);
  });

  it('throws 404 NotFoundException for an unknown id', () => {
    expect(() => controller.getOne('does-not-exist')).toThrow(NotFoundException);
  });
});

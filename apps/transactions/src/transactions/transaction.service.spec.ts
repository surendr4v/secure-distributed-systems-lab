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

  it('approves an existing transaction', () => {
    const record = service.submit(payload);
    const approved = service.approve(record.id);
    expect(approved?.status).toBe('approved');
  });
});

import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@shared/index';
import { CreateTransactionDto } from './dto';
import { TransactionRecord } from './types';

@Injectable()
export class TransactionRepository {
  constructor(private readonly db: DatabaseService) {}

  async create(input: CreateTransactionDto, createdBy: string, idempotencyKey: string): Promise<TransactionRecord> {
    const result = await this.db.query<TransactionRecord>(
      `INSERT INTO transactions (from_account_id, to_account_id, amount, currency, status, description, idempotency_key, created_by)
       VALUES ($1, $2, $3, $4, 'PENDING', $5, $6, $7)
       ON CONFLICT (idempotency_key) DO UPDATE SET idempotency_key = EXCLUDED.idempotency_key
       RETURNING *`,
      [input.fromAccountId, input.toAccountId, input.amount, input.currency, input.description ?? null, idempotencyKey, createdBy],
    );
    return result.rows[0];
  }

  async list(limit: number): Promise<TransactionRecord[]> {
    const result = await this.db.query<TransactionRecord>('SELECT * FROM transactions ORDER BY created_at DESC LIMIT $1', [limit]);
    return result.rows;
  }

  async getById(id: string): Promise<TransactionRecord | null> {
    const result = await this.db.query<TransactionRecord>('SELECT * FROM transactions WHERE id = $1 LIMIT 1', [id]);
    return result.rows[0] ?? null;
  }

  async updateStatus(id: string, status: 'PENDING' | 'COMPLETED' | 'REJECTED'): Promise<TransactionRecord | null> {
    const result = await this.db.query<TransactionRecord>(
      'UPDATE transactions SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *',
      [id, status],
    );
    return result.rows[0] ?? null;
  }
}

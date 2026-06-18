import { createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@shared/index';
import { AppendAuditDto } from './dto';

interface AuditRow {
  id: string;
  prev_hash: string | null;
  entry_hash: string;
  event_type: string;
  actor: string;
  resource: string;
  payload: Record<string, unknown>;
  created_at: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly db: DatabaseService) {}

  async append(input: AppendAuditDto): Promise<{ id: string; hash: string }> {
    const prev = await this.db.query<{ entry_hash: string }>(
      'SELECT entry_hash FROM audit_events ORDER BY created_at DESC LIMIT 1',
    );

    const prevHash = prev.rows[0]?.entry_hash ?? null;
    const createdAt = new Date().toISOString();
    const body = `${prevHash ?? ''}|${input.eventType}|${input.actor}|${input.resource}|${JSON.stringify(input.payload ?? {})}|${createdAt}`;
    const entryHash = createHash('sha256').update(body).digest('hex');

    const result = await this.db.query<{ id: string }>(
      `INSERT INTO audit_events (prev_hash, entry_hash, event_type, actor, resource, payload, created_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
       RETURNING id`,
      [prevHash, entryHash, input.eventType, input.actor, input.resource, JSON.stringify(input.payload ?? {}), createdAt],
    );

    return { id: result.rows[0].id, hash: entryHash };
  }

  async list(limit: number): Promise<AuditRow[]> {
    const result = await this.db.query<AuditRow>(
      `SELECT id, prev_hash, entry_hash, event_type, actor, resource, payload, created_at
       FROM audit_events ORDER BY created_at DESC LIMIT $1`,
      [limit],
    );
    return result.rows;
  }
}

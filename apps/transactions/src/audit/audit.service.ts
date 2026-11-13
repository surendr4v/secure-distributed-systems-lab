import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { dirname } from 'path';
import { v4 as uuid } from 'uuid';

export interface AuditRecord {
  id: string;
  at: string;
  actor?: string;
  subject?: string;
  action: string;
  resource: string;
  status: number;
  prevHash?: string | null;
  entryHash?: string;
  meta?: Record<string, any>;
}

class CircuitBreaker {
  private failureCount = 0;
  private state: 'closed' | 'open' = 'closed';
  private openedAt = 0;

  constructor(
    private readonly options = {
      failureThreshold: 5,
      cooldownMs: 30000,
      minimumSamples: 5,
    },
  ) {}

  allowRequest(): boolean {
    if (this.state === 'open') {
      if (Date.now() - this.openedAt >= this.options.cooldownMs) {
        this.state = 'closed';
        this.failureCount = 0;
        return true;
      }
      return false;
    }

    return true;
  }

  recordSuccess(): void {
    this.failureCount = 0;
    this.state = 'closed';
    this.openedAt = 0;
  }

  recordFailure(): void {
    this.failureCount += 1;
    if (
      this.failureCount >= this.options.failureThreshold &&
      this.state !== 'open'
    ) {
      this.state = 'open';
      this.openedAt = Date.now();
    }
  }

  getState(): 'closed' | 'open' {
    return this.state;
  }
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger('audit');
  private readonly logPath: string;
  private readonly breaker = new CircuitBreaker();

  constructor(private readonly config: ConfigService) {
    this.logPath = this.config.get<string>('AUDIT_LOG_PATH', 'logs/audit.log');
  }

  async write(
    record: Omit<AuditRecord, 'id' | 'at' | 'prevHash' | 'entryHash'>,
  ) {
    const entry = await this.buildEntry(record);
    await this.persist(entry);
    return entry;
  }

  getCircuitState(): 'closed' | 'open' {
    return this.breaker.getState();
  }

  async verifyChain(): Promise<{ valid: boolean; invalidAt?: string }> {
    try {
      await fs.mkdir(dirname(this.logPath), { recursive: true });
      const content = await fs.readFile(this.logPath, 'utf-8');
      const lines = content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      let previousHash: string | null = null;
      for (const line of lines) {
        const record = JSON.parse(line) as AuditRecord;
        const expectedHash = this.calculateEntryHash(record, previousHash);

        if (record.entryHash !== expectedHash) {
          return { valid: false, invalidAt: record.id };
        }

        if (previousHash !== null && record.prevHash !== previousHash) {
          return { valid: false, invalidAt: record.id };
        }

        previousHash = record.entryHash ?? null;
      }

      return { valid: true };
    } catch (error) {
      this.logger.warn('Unable to verify audit chain');
      return { valid: false, invalidAt: 'unavailable' };
    }
  }

  private async buildEntry(
    record: Omit<AuditRecord, 'id' | 'at' | 'prevHash' | 'entryHash'>,
  ): Promise<AuditRecord> {
    const previousHash = await this.readLastHash();
    const at = new Date().toISOString();
    const entry: AuditRecord = {
      ...record,
      id: uuid(),
      at,
      prevHash: previousHash,
    };

    entry.entryHash = this.calculateEntryHash(entry, previousHash);
    return entry;
  }

  private async readLastHash(): Promise<string | null> {
    try {
      await fs.mkdir(dirname(this.logPath), { recursive: true });
      const content = await fs.readFile(this.logPath, 'utf-8');
      const lines = content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length === 0) return null;
      const lastLine = lines[lines.length - 1];
      const lastEntry = JSON.parse(lastLine) as Partial<AuditRecord>;
      return lastEntry.entryHash ?? null;
    } catch {
      return null;
    }
  }

  private calculateEntryHash(
    record: Partial<AuditRecord>,
    previousHash: string | null,
  ): string {
    const canonical = {
      id: record.id,
      at: record.at,
      actor: record.actor ?? null,
      subject: record.subject ?? null,
      action: record.action,
      resource: record.resource,
      status: record.status,
      prevHash: previousHash,
      meta: record.meta ?? null,
    };

    const payload = JSON.stringify(canonical, Object.keys(canonical).sort());
    return createHash('sha256').update(payload).digest('hex');
  }

  private async persist(entry: AuditRecord) {
    if (!this.breaker.allowRequest()) {
      this.logger.warn(
        `audit circuit open; skipping persistence for resource=${entry.resource}`,
      );
      return;
    }

    try {
      await fs.mkdir(dirname(this.logPath), { recursive: true });
      const serialized = JSON.stringify(entry) + '\n';
      await fs.appendFile(this.logPath, serialized);
      this.breaker.recordSuccess();
      this.logger.log(
        `audit ${entry.action} resource=${entry.resource} status=${entry.status} hash=${entry.entryHash}`,
      );
    } catch (error) {
      this.breaker.recordFailure();
      this.logger.error('Failed to persist audit record', error as any);
    }
  }
}

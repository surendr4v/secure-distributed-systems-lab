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

@Injectable()
export class AuditService {
  private readonly logger = new Logger('audit');
  private readonly logPath: string;

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
    try {
      await fs.mkdir(dirname(this.logPath), { recursive: true });
      const serialized = JSON.stringify(entry) + '\n';
      await fs.appendFile(this.logPath, serialized);
      this.logger.log(
        `audit ${entry.action} resource=${entry.resource} status=${entry.status} hash=${entry.entryHash}`,
      );
    } catch (error) {
      this.logger.error('Failed to persist audit record', error as any);
    }
  }
}

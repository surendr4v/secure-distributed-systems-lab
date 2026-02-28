import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  meta?: Record<string, any>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger('audit');
  private readonly logPath: string;

  constructor(private readonly config: ConfigService) {
    this.logPath = this.config.get<string>('AUDIT_LOG_PATH', 'logs/audit.log');
  }

  async write(record: Omit<AuditRecord, 'id' | 'at'>) {
    const entry: AuditRecord = {
      ...record,
      id: uuid(),
      at: new Date().toISOString(),
    };
    await this.persist(entry);
  }

  private async persist(entry: AuditRecord) {
    try {
      await fs.mkdir(dirname(this.logPath), { recursive: true });
      await fs.appendFile(this.logPath, JSON.stringify(entry) + '\n');
      this.logger.log(`audit ${entry.action} resource=${entry.resource} status=${entry.status}`);
    } catch (error) {
      this.logger.error('Failed to persist audit record', error as any);
    }
  }
}

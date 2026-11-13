import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';

export interface OutboxEvent {
  id: string;
  eventType: string;
  actor: string;
  resource: string;
  payload: Record<string, unknown>;
  createdAt: string;
  prevHash: string | null;
  hash: string;
  status: 'pending' | 'sent';
}

export interface EnqueueOutboxDto {
  eventType: string;
  actor: string;
  resource: string;
  payload?: Record<string, unknown>;
}

@Injectable()
export class OutboxService {
  private readonly logger = new Logger('outbox');
  private readonly events = new Map<string, OutboxEvent>();

  enqueue(input: EnqueueOutboxDto): OutboxEvent {
    const id = `${input.eventType}:${Date.now()}:${Math.random().toString(16).slice(2)}`;
    const createdAt = new Date().toISOString();
    const lastEvent = this.getLastEvent();
    const prevHash = lastEvent?.hash ?? null;
    const hash = this.calculateHash({
      id,
      eventType: input.eventType,
      actor: input.actor,
      resource: input.resource,
      payload: input.payload ?? {},
      createdAt,
      prevHash,
    });

    const event: OutboxEvent = {
      id,
      eventType: input.eventType,
      actor: input.actor,
      resource: input.resource,
      payload: input.payload ?? {},
      createdAt,
      prevHash,
      hash,
      status: 'pending',
    };

    this.events.set(id, event);
    return event;
  }

  listPending(): OutboxEvent[] {
    return [...this.events.values()].filter(
      (event) => event.status === 'pending',
    );
  }

  markSent(id: string): boolean {
    const event = this.events.get(id);
    if (!event || event.status === 'sent') {
      return false;
    }

    this.events.set(id, { ...event, status: 'sent' });
    return true;
  }

  verifyChain(): { valid: boolean; invalidAt?: string } {
    const ordered = [...this.events.values()].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    let previousHash: string | null = null;
    for (const event of ordered) {
      const expectedHash = this.calculateHash({
        id: event.id,
        eventType: event.eventType,
        actor: event.actor,
        resource: event.resource,
        payload: event.payload,
        createdAt: event.createdAt,
        prevHash: previousHash,
      });

      if (event.hash !== expectedHash) {
        return { valid: false, invalidAt: event.id };
      }

      if (previousHash !== null && event.prevHash !== previousHash) {
        return { valid: false, invalidAt: event.id };
      }

      previousHash = event.hash;
    }

    return { valid: true };
  }

  getStats(): { count: number; pending: number; sent: number } {
    const all = [...this.events.values()];
    return {
      count: all.length,
      pending: all.filter((event) => event.status === 'pending').length,
      sent: all.filter((event) => event.status === 'sent').length,
    };
  }

  private getLastEvent(): OutboxEvent | undefined {
    const ordered = [...this.events.values()].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    return ordered[ordered.length - 1];
  }

  private calculateHash(input: {
    id: string;
    eventType: string;
    actor: string;
    resource: string;
    payload: Record<string, unknown>;
    createdAt: string;
    prevHash: string | null;
  }): string {
    const canonical = {
      id: input.id,
      eventType: input.eventType,
      actor: input.actor,
      resource: input.resource,
      payload: input.payload ?? {},
      createdAt: input.createdAt,
      prevHash: input.prevHash,
    };

    return createHash('sha256')
      .update(JSON.stringify(canonical, Object.keys(canonical).sort()))
      .digest('hex');
  }
}

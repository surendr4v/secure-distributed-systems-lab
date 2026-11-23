import { OutboxService } from './outbox.service';

describe('OutboxService', () => {
  let outbox: OutboxService;

  beforeEach(() => {
    outbox = new OutboxService();
  });

  it('enqueues pending events in a hash chain', () => {
    const first = outbox.enqueue({
      eventType: 'CREATED',
      actor: 'alice',
      resource: '/transactions/1',
    });
    const second = outbox.enqueue({
      eventType: 'APPROVED',
      actor: 'bob',
      resource: '/transactions/1',
      payload: { status: 'approved' },
    });

    expect(first.status).toBe('pending');
    expect(first.prevHash).toBeNull();
    expect(first.payload).toEqual({});
    expect(second.prevHash).toBe(first.hash);
    expect(outbox.verifyChain()).toEqual({ valid: true });
  });

  it('lists and marks pending events', () => {
    const event = outbox.enqueue({
      eventType: 'CREATED',
      actor: 'alice',
      resource: '/transactions/1',
    });

    expect(outbox.listPending()).toEqual([event]);
    expect(outbox.markSent(event.id)).toBe(true);
    expect(outbox.markSent(event.id)).toBe(false);
    expect(outbox.listPending()).toEqual([]);
  });

  it('returns false for unknown events', () => {
    expect(outbox.markSent('missing')).toBe(false);
  });

  it('reports outbox statistics', () => {
    const pending = outbox.enqueue({
      eventType: 'CREATED',
      actor: 'system',
      resource: '/transactions/1',
    });
    outbox.markSent(pending.id);

    outbox.enqueue({
      eventType: 'APPROVED',
      actor: 'approver',
      resource: '/transactions/1',
    });

    expect(outbox.getStats()).toEqual({ count: 2, pending: 1, sent: 1 });
  });

  it('detects tampering with an event hash', () => {
    const event = outbox.enqueue({
      eventType: 'CREATED',
      actor: 'alice',
      resource: '/transactions/1',
    });

    (event as any).hash = 'tampered';

    expect(outbox.verifyChain()).toEqual({ valid: false, invalidAt: event.id });
  });

  it('detects a broken previous-hash link', () => {
    const first = outbox.enqueue({
      eventType: 'CREATED',
      actor: 'alice',
      resource: '/transactions/1',
    });
    const second = outbox.enqueue({
      eventType: 'APPROVED',
      actor: 'bob',
      resource: '/transactions/1',
    });

    (second as any).prevHash = 'wrong-link';

    expect(outbox.verifyChain()).toEqual({
      valid: false,
      invalidAt: second.id,
    });
  });
});

import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  InMemoryProcessedEventStore,
  OutboxRelay,
  type OutboxStore,
  RabbitMqClient,
} from '../src/index.js';
import type { EventEnvelope } from '@pediritos/contracts';

const event: EventEnvelope = {
  eventId: randomUUID(),
  eventType: 'order.created',
  eventVersion: 1,
  occurredAt: new Date().toISOString(),
  correlationId: randomUUID(),
  payload: {},
};

describe('RabbitMQ messaging primitives', () => {
  it('stores event IDs for consumer deduplication', async () => {
    const store = new InMemoryProcessedEventStore();
    expect(await store.has('evt-1')).toBe(false);
    await store.markProcessed('evt-1');
    expect(await store.has('evt-1')).toBe(true);
  });

  it('fails fast when asked to publish before connecting', async () => {
    const client = new RabbitMqClient('amqp://localhost:5672');
    await expect(client.publish('order.created', {} as never)).rejects.toThrow(
      'RabbitMQ client is not connected',
    );
  });

  it('marks an outbox row published after broker confirmation', async () => {
    const record = { id: 'outbox-1', routingKey: 'order.created', event, attempts: 0 };
    const store: OutboxStore = {
      claimPending: vi.fn().mockResolvedValue([record]),
      markPublished: vi.fn().mockResolvedValue(undefined),
      recordFailure: vi.fn().mockResolvedValue(undefined),
    };
    const publisher = { publish: vi.fn().mockResolvedValue(undefined) };
    const relay = new OutboxRelay(store, publisher);

    await expect(relay.publishBatch()).resolves.toEqual({ published: 1, failed: 0 });
    expect(publisher.publish).toHaveBeenCalledWith(record.routingKey, event);
    expect(store.markPublished).toHaveBeenCalledWith('outbox-1', expect.any(Date));
  });

  it('schedules an outbox retry after a publish failure', async () => {
    const record = { id: 'outbox-2', routingKey: 'order.created', event, attempts: 1 };
    const store: OutboxStore = {
      claimPending: vi.fn().mockResolvedValue([record]),
      markPublished: vi.fn().mockResolvedValue(undefined),
      recordFailure: vi.fn().mockResolvedValue(undefined),
    };
    const publisher = { publish: vi.fn().mockRejectedValue(new Error('broker unavailable')) };
    const relay = new OutboxRelay(store, publisher, 1_000, 500);

    await expect(relay.publishBatch()).resolves.toEqual({ published: 0, failed: 1 });
    expect(store.recordFailure).toHaveBeenCalledWith(
      'outbox-2',
      'broker unavailable',
      expect.any(Date),
    );
  });
});

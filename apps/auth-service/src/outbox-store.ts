import { Injectable } from '@nestjs/common';
import type { EventEnvelope } from '@pediritos/contracts';
import type { OutboxRecord, OutboxStore } from '@pediritos/messaging';
import { PrismaService } from './prisma.service.js';

interface OutboxRow {
  id: string;
  routingKey: string;
  event: unknown;
  attempts: number;
}

@Injectable()
export class AuthOutboxStore implements OutboxStore {
  constructor(private readonly prisma: PrismaService) {}

  async claimPending(
    limit: number,
    leaseExpiresAt: Date,
  ): Promise<OutboxRecord[]> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
      throw new RangeError('Outbox claim limit must be between 1 and 500');
    }
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<OutboxRow[]>`
        SELECT id, routing_key AS "routingKey", event, attempts
        FROM outbox_events
        WHERE published_at IS NULL AND available_at <= NOW()
        ORDER BY created_at ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      `;
      if (rows.length === 0) return [];
      await tx.outboxEvent.updateMany({
        where: { id: { in: rows.map((row) => row.id) }, publishedAt: null },
        data: { availableAt: leaseExpiresAt },
      });
      return rows.map((row) => ({
        id: row.id,
        routingKey: row.routingKey,
        event: row.event as EventEnvelope,
        attempts: row.attempts,
      }));
    });
  }

  async markPublished(id: string, publishedAt: Date): Promise<void> {
    const result = await this.prisma.outboxEvent.updateMany({
      where: { id, publishedAt: null },
      data: { publishedAt },
    });
    if (result.count !== 1)
      throw new Error('Outbox row was already published or removed');
  }

  async recordFailure(
    id: string,
    reason: string,
    retryAfter: Date,
  ): Promise<void> {
    await this.prisma.outboxEvent.updateMany({
      where: { id, publishedAt: null },
      data: {
        availableAt: retryAfter,
        attempts: { increment: 1 },
        lastError: reason.slice(0, 1_000),
      },
    });
  }
}

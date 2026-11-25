# Messaging

The shared `@pediritos/messaging` package provides a durable topic exchange named `pediritos.events.v1` and a dead-letter exchange named `pediritos.events.v1.dead`.

## Envelope

```json
{
  "eventId": "UUID",
  "eventType": "order.created",
  "eventVersion": 1,
  "occurredAt": "2026-11-25T12:00:00.000Z",
  "correlationId": "request-or-saga-id",
  "payload": {}
}
```

Contracts are in `@pediritos/contracts`. The package validates the envelope and the current `order.created`, `payment.approved`, and `payment.failed` payloads. New incompatible payloads must use a new event version.

`RabbitMqClient` publishes persistent JSON messages and waits for publisher confirms. Consumers use manual acknowledgements, durable queues, bounded exponential-delay retry queues, and a durable `.dlq` queue. Invalid messages go directly to the DLQ. Consumer idempotency is supplied through `ProcessedEventStore`.

`OutboxRelay` is a generic relay over an `OutboxStore` interface. It leases pending rows, publishes stable event IDs, marks successful sends, and schedules failed sends with exponential backoff. A publish can succeed before a database mark fails, so the consumer must still deduplicate. The app-specific Prisma outbox stores, migrations, consumer wiring, and broker integration tests remain to be implemented.

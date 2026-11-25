import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  EventValidationError,
  orderCreatedEventSchema,
  validateEventEnvelope,
} from '../src/index.js';

const validOrderCreated = {
  eventId: randomUUID(),
  eventType: 'order.created',
  eventVersion: 1,
  occurredAt: new Date().toISOString(),
  correlationId: randomUUID(),
  payload: {
    orderId: randomUUID(),
    customerId: randomUUID(),
    currency: 'BRL',
    totalAmountMinor: 3500,
    items: [{ productId: randomUUID(), name: 'Item', quantity: 1, unitPriceMinor: 3500 }],
  },
};

describe('versioned event contracts', () => {
  it('validates an order-created event envelope and payload', () => {
    expect(orderCreatedEventSchema.validate(validOrderCreated).error).toBeUndefined();
    expect(validateEventEnvelope(validOrderCreated).eventVersion).toBe(1);
  });

  it('rejects a payload that does not conform to the event-specific schema', () => {
    const invalid = { ...validOrderCreated, payload: { ...validOrderCreated.payload, items: [] } };
    expect(() => validateEventEnvelope(invalid)).toThrow(EventValidationError);
  });
});

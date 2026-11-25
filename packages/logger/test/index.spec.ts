import { afterEach, describe, expect, it, vi } from 'vitest';
import { correlationIdMiddleware, runWithLogContext, StructuredLogger } from '../src/index.js';

describe('structured logger', () => {
  afterEach(() => vi.restoreAllMocks());

  it('writes JSON with service context and redacts sensitive fields', () => {
    const output = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const logger = new StructuredLogger('unit-test');

    runWithLogContext(
      () => logger.log('request handled', { userId: 'user-1', password: 'do-not-log' }),
      { correlationId: 'correlation-1' },
    );

    const entry = JSON.parse(String(output.mock.calls[0]?.[0])) as Record<string, unknown>;
    expect(entry).toMatchObject({
      service: 'unit-test',
      correlationId: 'correlation-1',
      userId: 'user-1',
      password: '[REDACTED]',
    });

    logger.log({ details: { accessToken: 'hidden' } });
    const objectEntry = JSON.parse(String(output.mock.calls[1]?.[0])) as {
      message: { details: { accessToken: string } };
    };
    expect(objectEntry.message.details.accessToken).toBe('[REDACTED]');
  });

  it('generates a safe correlation ID when the request header is invalid', () => {
    let responseId = '';
    let nextWasCalled = false;
    correlationIdMiddleware(
      { headers: { 'x-correlation-id': 'invalid value\r\n' } },
      { setHeader: (_name, value) => (responseId = value) },
      () => (nextWasCalled = true),
    );

    expect(responseId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(nextWasCalled).toBe(true);
  });
});

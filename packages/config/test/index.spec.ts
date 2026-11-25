import { describe, expect, it } from 'vitest';
import { validateEnvironment } from '../src/index.js';

describe('environment validation', () => {
  it('applies defaults after validating required infrastructure URLs and secrets', () => {
    const result = validateEnvironment({
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/pediritos',
      RABBITMQ_URL: 'amqp://user:pass@localhost:5672',
      REDIS_URL: 'redis://localhost:6379',
      JWT_SECRET: 'a-local-test-secret-longer-than-thirty-two-characters',
      JWT_REFRESH_SECRET: 'a-local-refresh-secret-longer-than-thirty-two-characters',
    });

    expect(result.NODE_ENV).toBe('development');
    expect(result.PORT).toBe(3000);
    expect(result.SMTP_PORT).toBe(1025);
  });

  it('reports all required values when invalid', () => {
    expect(() => validateEnvironment({})).toThrow(/DATABASE_URL/);
  });
});

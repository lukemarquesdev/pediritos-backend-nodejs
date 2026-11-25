process.env.DATABASE_URL ??=
  'postgresql://pediritos:pediritos@localhost:5432/pediritos_test';
process.env.RABBITMQ_URL ??= 'amqp://guest:guest@localhost:5672';
process.env.REDIS_URL ??= 'redis://localhost:6379';
process.env.JWT_SECRET ??= 'test-secret-that-is-at-least-thirty-two-characters';
process.env.JWT_REFRESH_SECRET ??=
  'test-refresh-secret-at-least-thirty-two-characters';

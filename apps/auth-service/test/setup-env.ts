process.env.NODE_ENV ??= 'test';
process.env.PORT ??= '3000';
process.env.DATABASE_URL ??=
  'postgresql://pediritos:pediritos@localhost:5432/pediritos_auth?schema=public';
process.env.REDIS_URL ??= 'redis://localhost:6379';
process.env.RABBITMQ_URL ??= 'amqp://guest:guest@localhost:5672';
process.env.JWT_SECRET ??=
  'test-access-secret-that-is-longer-than-32-characters';
process.env.JWT_REFRESH_SECRET ??=
  'test-refresh-secret-that-is-longer-than-32-characters';
process.env.AUTH_ACTION_ENCRYPTION_KEY ??=
  'test-action-encryption-key-longer-than-32-characters';

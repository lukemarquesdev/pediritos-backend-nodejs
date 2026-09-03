export default () => ({
  environment: process.env.NODE_ENV ?? 'development',

  port: Number(process.env.PORT ?? 3000),

  database: {
    url: process.env.DATABASE_URL,
  },

  rabbitmq: {
    url: process.env.RABBITMQ_URL,
  },

  redis: {
    url: process.env.REDIS_URL,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
});

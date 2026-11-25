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

  mail: {
    host: process.env.SMTP_HOST ?? 'localhost',
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.MAIL_FROM ?? 'Pediritos <no-reply@pediritos.local>',
  },
});

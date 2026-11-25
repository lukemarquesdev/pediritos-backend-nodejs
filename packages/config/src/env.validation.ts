import Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),

  PORT: Joi.number().port().default(3000),

  DATABASE_URL: Joi.string().uri().required(),

  RABBITMQ_URL: Joi.string().uri().required(),

  REDIS_URL: Joi.string().uri().required(),

  JWT_SECRET: Joi.string().min(32).required(),

  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),

  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  SMTP_HOST: Joi.string().default('localhost'),
  SMTP_PORT: Joi.number().port().default(1025),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().allow('').optional(),
  SMTP_PASSWORD: Joi.string().allow('').optional(),
  MAIL_FROM: Joi.string().min(3).max(255).default('Pediritos <no-reply@pediritos.local>'),
});

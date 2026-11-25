export { envValidationSchema } from './env.validation.js';
export { default as configuration } from './configuration.js';

export interface AppEnvironment {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  DATABASE_URL: string;
  RABBITMQ_URL: string;
  REDIS_URL: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  AUTH_ACTION_ENCRYPTION_KEY?: string;
  JWT_ACCESS_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_SECURE?: boolean;
  SMTP_USER?: string;
  SMTP_PASSWORD?: string;
  MAIL_FROM?: string;
}

import { envValidationSchema } from './env.validation.js';

export function validateEnvironment(
  environment: Record<string, unknown> = process.env,
): AppEnvironment {
  const { error, value } = envValidationSchema.validate(environment, {
    abortEarly: false,
    allowUnknown: true,
    convert: true,
  });
  if (error) {
    const invalidKeys = [
      ...new Set(error.details.map((detail) => String(detail.path[0] ?? 'unknown'))),
    ];
    throw new Error(`Invalid environment configuration: ${invalidKeys.join(', ')}`, {
      cause: error,
    });
  }
  return value as AppEnvironment;
}

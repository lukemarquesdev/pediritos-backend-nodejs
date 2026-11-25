import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogContext = Record<string, unknown>;

interface RequestContext {
  correlationId: string;
  values: LogContext;
}

const requestContext = new AsyncLocalStorage<RequestContext>();
const sensitiveKey = /(authorization|password|secret|token|card|cookie)/i;

export function createCorrelationId(): string {
  return randomUUID();
}

export function runWithLogContext<T>(callback: () => T, context: Partial<RequestContext> = {}): T {
  return requestContext.run(
    {
      correlationId: context.correlationId ?? createCorrelationId(),
      values: context.values ?? {},
    },
    callback,
  );
}

export interface CorrelationRequest {
  headers: Record<string, string | string[] | undefined>;
}

export interface CorrelationResponse {
  setHeader(name: string, value: string): void;
}

export function correlationIdMiddleware(
  request: CorrelationRequest,
  response: CorrelationResponse,
  next: () => void,
): void {
  const header = request.headers['x-correlation-id'];
  const candidate = Array.isArray(header) ? header[0] : header;
  const correlationId =
    candidate && /^[a-zA-Z0-9._:-]{1,128}$/.test(candidate) ? candidate : createCorrelationId();
  response.setHeader('x-correlation-id', correlationId);
  runWithLogContext(next, { correlationId });
}

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      sensitiveKey.test(key) ? '[REDACTED]' : redact(entry),
    ]),
  );
}

export class StructuredLogger {
  constructor(private readonly service: string) {}

  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.write('debug', message, this.context(optionalParams));
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.write('debug', message, this.context(optionalParams));
  }

  log(message: unknown, ...optionalParams: unknown[]): void {
    this.write('info', message, this.context(optionalParams));
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.write('warn', message, this.context(optionalParams));
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    this.write('error', message, this.context(optionalParams));
  }

  fatal(message: unknown, ...optionalParams: unknown[]): void {
    this.write('error', message, this.context(optionalParams));
  }

  private context(optionalParams: unknown[]): LogContext {
    return optionalParams.reduce<LogContext>((context, value) => {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        return { ...context, ...value };
      }
      if (typeof value === 'string') return { ...context, context: value };
      return context;
    }, {});
  }

  private write(level: LogLevel, message: unknown, context: LogContext): void {
    const scope = requestContext.getStore();
    const normalizedMessage =
      message instanceof Error
        ? { name: message.name, message: message.message, stack: message.stack }
        : message;
    const entry = redact({
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      ...(scope ? { correlationId: scope.correlationId, ...scope.values } : {}),
      message: normalizedMessage,
      ...context,
    });
    const output = JSON.stringify(entry);
    if (level === 'error') console.error(output);
    else if (level === 'warn') console.warn(output);
    else console.log(output);
  }
}

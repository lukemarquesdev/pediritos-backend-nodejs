import amqp, {
  type ChannelModel,
  type ConfirmChannel,
  type ConsumeMessage,
  type Options,
} from 'amqplib';
import { validateEventEnvelope, type EventEnvelope } from '@pediritos/contracts';

export const EVENT_EXCHANGE = 'pediritos.events.v1';
export const DEAD_LETTER_EXCHANGE = 'pediritos.events.v1.dead';

export interface ConsumerOptions<TPayload = Record<string, unknown>> {
  queue: string;
  routingKeys: string[];
  handler: (event: EventEnvelope<TPayload>) => Promise<void>;
  maxRetries?: number;
  retryDelayMs?: number;
}

export interface ProcessedEventStore {
  has(eventId: string): Promise<boolean>;
  markProcessed(eventId: string): Promise<void>;
}

export interface OutboxRecord<TPayload = Record<string, unknown>> {
  id: string;
  routingKey: string;
  event: EventEnvelope<TPayload>;
  attempts: number;
}

export interface OutboxStore<TPayload = Record<string, unknown>> {
  claimPending(limit: number, leaseExpiresAt: Date): Promise<OutboxRecord<TPayload>[]>;
  markPublished(id: string, publishedAt: Date): Promise<void>;
  recordFailure(id: string, reason: string, retryAfter: Date): Promise<void>;
}

export class OutboxRelay<TPayload = Record<string, unknown>> {
  constructor(
    private readonly store: OutboxStore<TPayload>,
    private readonly publisher: Pick<RabbitMqClient, 'publish'>,
    private readonly leaseMs = 30_000,
    private readonly retryBaseMs = 1_000,
  ) {}

  async publishBatch(limit = 50): Promise<{ published: number; failed: number }> {
    const records = await this.store.claimPending(limit, new Date(Date.now() + this.leaseMs));
    let published = 0;
    let failed = 0;

    for (const record of records) {
      try {
        await this.publisher.publish(record.routingKey, record.event);
        await this.store.markPublished(record.id, new Date());
        published += 1;
      } catch (error) {
        const delay = this.retryBaseMs * 2 ** Math.min(record.attempts, 10);
        const reason = error instanceof Error ? error.message : 'Unknown publish failure';
        await this.store.recordFailure(record.id, reason, new Date(Date.now() + delay));
        failed += 1;
      }
    }

    return { published, failed };
  }
}

export class InMemoryProcessedEventStore implements ProcessedEventStore {
  private readonly processed = new Set<string>();

  async has(eventId: string): Promise<boolean> {
    return this.processed.has(eventId);
  }

  async markProcessed(eventId: string): Promise<void> {
    this.processed.add(eventId);
  }
}

export class RabbitMqClient {
  private connection?: ChannelModel;
  private channel?: ConfirmChannel;

  constructor(
    private readonly url: string,
    private readonly processedEvents: ProcessedEventStore = new InMemoryProcessedEventStore(),
  ) {}

  async connect(): Promise<void> {
    if (this.channel) return;
    const connection = await amqp.connect(this.url);
    this.connection = connection;
    connection.on('error', (error: Error) => console.error('RabbitMQ connection error', error));
    connection.on('close', () => {
      if (this.connection === connection) {
        this.channel = undefined;
        this.connection = undefined;
      }
    });
    const channel = await connection.createConfirmChannel();
    this.channel = channel;
    await channel.assertExchange(EVENT_EXCHANGE, 'topic', { durable: true });
    await channel.assertExchange(DEAD_LETTER_EXCHANGE, 'topic', { durable: true });
  }

  async publish<TPayload>(routingKey: string, event: EventEnvelope<TPayload>): Promise<void> {
    const channel = this.requireChannel();
    const validEvent = validateEventEnvelope<TPayload>(event);
    channel.publish(EVENT_EXCHANGE, routingKey, Buffer.from(JSON.stringify(validEvent)), {
      persistent: true,
      contentType: 'application/json',
      messageId: validEvent.eventId,
      correlationId: validEvent.correlationId,
      timestamp: Date.parse(validEvent.occurredAt),
      type: validEvent.eventType,
    });
    await channel.waitForConfirms();
  }

  async consume<TPayload>(options: ConsumerOptions<TPayload>): Promise<void> {
    const channel = this.requireChannel();
    const maxRetries = options.maxRetries ?? 5;
    const retryDelayMs = options.retryDelayMs ?? 1_000;
    if (options.routingKeys.length === 0) {
      throw new Error('At least one routing key is required');
    }
    if (!Number.isInteger(maxRetries) || maxRetries < 0 || maxRetries > 10) {
      throw new RangeError('maxRetries must be an integer from 0 to 10');
    }
    if (!Number.isInteger(retryDelayMs) || retryDelayMs < 1 || retryDelayMs > 300_000) {
      throw new RangeError('retryDelayMs must be from 1 to 300000');
    }

    await channel.prefetch(10);
    await channel.assertQueue(options.queue, {
      durable: true,
      deadLetterExchange: DEAD_LETTER_EXCHANGE,
      deadLetterRoutingKey: options.queue,
    });
    await channel.assertQueue(`${options.queue}.dlq`, { durable: true });
    await channel.bindQueue(`${options.queue}.dlq`, DEAD_LETTER_EXCHANGE, options.queue);
    for (const routingKey of options.routingKeys) {
      await channel.bindQueue(options.queue, EVENT_EXCHANGE, routingKey);
    }

    for (let retry = 1; retry <= maxRetries; retry += 1) {
      for (const routingKey of options.routingKeys) {
        await channel.assertQueue(this.retryQueue(options.queue, retry, routingKey), {
          durable: true,
          messageTtl: retryDelayMs * 2 ** (retry - 1),
          deadLetterExchange: EVENT_EXCHANGE,
          deadLetterRoutingKey: routingKey,
        });
      }
    }

    await channel.consume(options.queue, (message) => {
      if (!message) return;
      void this.handleMessage(channel, options, message, maxRetries).catch((error: unknown) => {
        console.error('RabbitMQ message handling failed', error);
        channel.nack(message, false, false);
      });
    });
  }

  async close(): Promise<void> {
    const channel = this.channel;
    const connection = this.connection;
    this.channel = undefined;
    this.connection = undefined;
    await channel?.close();
    await connection?.close();
  }

  private async handleMessage<TPayload>(
    channel: ConfirmChannel,
    options: ConsumerOptions<TPayload>,
    message: ConsumeMessage,
    maxRetries: number,
  ): Promise<void> {
    let event: EventEnvelope<TPayload>;
    try {
      event = validateEventEnvelope<TPayload>(JSON.parse(message.content.toString()) as unknown);
    } catch (error) {
      await this.publishDeadLetter(channel, options.queue, message, error);
      channel.ack(message);
      return;
    }

    if (await this.processedEvents.has(event.eventId)) {
      channel.ack(message);
      return;
    }

    try {
      await options.handler(event);
      await this.processedEvents.markProcessed(event.eventId);
      channel.ack(message);
    } catch (error) {
      const retryCount = Number(message.properties.headers?.['x-retry-count'] ?? 0);
      if (retryCount < maxRetries) {
        const retryQueue = this.retryQueue(
          options.queue,
          retryCount + 1,
          message.fields.routingKey,
        );
        channel.sendToQueue(
          retryQueue,
          message.content,
          this.retryProperties(message, retryCount + 1),
        );
        await channel.waitForConfirms();
        channel.ack(message);
        return;
      }
      await this.publishDeadLetter(channel, options.queue, message, error);
      channel.ack(message);
    }
  }

  private retryQueue(queue: string, attempt: number, routingKey: string): string {
    const keySuffix = Buffer.from(routingKey).toString('base64url');
    return `${queue}.retry.${attempt}.${keySuffix}`;
  }

  private retryProperties(message: ConsumeMessage, retryCount: number): Options.Publish {
    return {
      persistent: true,
      contentType: message.properties.contentType,
      messageId: message.properties.messageId,
      correlationId: message.properties.correlationId,
      type: message.properties.type,
      headers: { ...message.properties.headers, 'x-retry-count': retryCount },
    };
  }

  private async publishDeadLetter(
    channel: ConfirmChannel,
    queue: string,
    message: ConsumeMessage,
    cause: unknown,
  ): Promise<void> {
    channel.publish(DEAD_LETTER_EXCHANGE, queue, message.content, {
      persistent: true,
      contentType: message.properties.contentType,
      messageId: message.properties.messageId,
      correlationId: message.properties.correlationId,
      type: message.properties.type,
      headers: {
        ...message.properties.headers,
        'x-dead-letter-reason': cause instanceof Error ? cause.message : 'Unknown processing error',
      },
    });
    await channel.waitForConfirms();
  }

  private requireChannel(): ConfirmChannel {
    if (!this.channel) throw new Error('RabbitMQ client is not connected');
    return this.channel;
  }
}

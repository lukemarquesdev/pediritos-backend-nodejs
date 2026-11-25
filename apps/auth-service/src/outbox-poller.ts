import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OutboxRelay, RabbitMqClient } from '@pediritos/messaging';
import { StructuredLogger } from '@pediritos/logger';
import { AuthOutboxStore } from './outbox-store.js';

@Injectable()
export class OutboxPoller implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new StructuredLogger('auth-service');
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly config: ConfigService,
    private readonly rabbit: RabbitMqClient,
    private readonly relay: OutboxRelay,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.flush(), 1_000);
    this.timer.unref();
    void this.flush();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    await this.rabbit.close().catch(() => undefined);
  }

  private async flush(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.rabbit.connect();
      const result = await this.relay.publishBatch();
      if (result.failed > 0) {
        this.logger.warn('Some auth outbox events need retry', {
          failed: result.failed,
        });
      }
    } catch (error) {
      this.logger.warn('Auth outbox relay is waiting for infrastructure', {
        errorType: error instanceof Error ? error.name : 'UnknownError',
        service: this.config.get<string>('NODE_ENV', 'development'),
      });
    } finally {
      this.running = false;
    }
  }
}

export const outboxRelayProvider = {
  provide: OutboxRelay,
  inject: [AuthOutboxStore, RabbitMqClient],
  useFactory: (store: AuthOutboxStore, publisher: RabbitMqClient) =>
    new OutboxRelay(store, publisher),
};

export const rabbitMqClientProvider = {
  provide: RabbitMqClient,
  inject: [ConfigService],
  useFactory: (config: ConfigService) =>
    new RabbitMqClient(config.getOrThrow<string>('RABBITMQ_URL')),
};

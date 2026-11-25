import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { configuration, envValidationSchema } from '@pediritos/config';
import {
  OutboxPoller,
  outboxRelayProvider,
  rabbitMqClientProvider,
} from './outbox-poller.js';
import { AuthOutboxStore } from './outbox-store.js';
import { AccessTokenGuard } from './access-token.guard.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaService } from './prisma.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validationSchema: envValidationSchema,
    }),
    JwtModule.register({}),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PrismaService,
    AccessTokenGuard,
    AuthOutboxStore,
    OutboxPoller,
    outboxRelayProvider,
    rabbitMqClientProvider,
  ],
})
export class AppModule {}

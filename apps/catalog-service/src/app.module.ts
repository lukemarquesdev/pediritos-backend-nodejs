import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { configuration, envValidationSchema } from '@pediritos/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AdminGuard } from './admin.guard.js';
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
  providers: [AppService, PrismaService, AdminGuard],
})
export class AppModule {}

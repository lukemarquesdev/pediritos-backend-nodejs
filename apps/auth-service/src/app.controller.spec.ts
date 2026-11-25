import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AccessTokenGuard } from './access-token.guard.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: {
            getHello: () => ({ service: 'auth-service', status: 'ok' }),
          },
        },
        { provide: AccessTokenGuard, useValue: { canActivate: () => true } },
        { provide: JwtService, useValue: {} },
        { provide: ConfigService, useValue: {} },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('returns service readiness', () => {
      expect(appController.getHello()).toEqual({
        service: 'auth-service',
        status: 'ok',
      });
    });
  });
});

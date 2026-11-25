import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AppService } from './app.service.js';
import { PrismaService } from './prisma.service.js';

describe('Auth AppService', () => {
  it('uses a generic unauthorized response for an unknown email', async () => {
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue(null) },
    } as unknown as PrismaService;
    const config = {
      getOrThrow: (key: string) =>
        key === 'JWT_SECRET'
          ? 'access-secret-that-is-long-enough-for-tests'
          : 'refresh-secret-that-is-long-enough-for-tests',
      get: (_key: string, fallback: string) => fallback,
    } as unknown as ConfigService;
    const service = new AppService(prisma, new JwtService(), config);

    await expect(
      service.login('missing@example.test', 'wrong-password'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'missing@example.test' },
      include: { userRoles: { include: { role: true } } },
    });
  });
});

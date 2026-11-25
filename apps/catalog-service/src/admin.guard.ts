import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const [scheme, token, extra] =
      request.headers.authorization?.split(' ') ?? [];
    if (scheme?.toLowerCase() !== 'bearer' || !token || extra) {
      throw new UnauthorizedException('Administrator access token is required');
    }
    try {
      const claims = await this.jwt.verifyAsync<{ roles?: string[] }>(token, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
        issuer: 'pediritos-auth',
        audience: 'pediritos-api',
      });
      if (!claims.roles?.includes('ADMIN')) {
        throw new UnauthorizedException('Administrator role is required');
      }
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException(
        'Administrator access token is invalid or expired',
      );
    }
  }
}

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

export interface AccessClaims {
  sub: string;
  email: string;
  roles: string[];
}

export type AuthenticatedRequest = Request & { user: AccessClaims };

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token, extra] =
      request.headers.authorization?.split(' ') ?? [];
    if (scheme?.toLowerCase() !== 'bearer' || !token || extra) {
      throw new UnauthorizedException('A bearer access token is required');
    }
    try {
      const claims = await this.jwt.verifyAsync<AccessClaims>(token, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
        issuer: 'pediritos-auth',
        audience: 'pediritos-api',
      });
      if (typeof claims.sub !== 'string' || !Array.isArray(claims.roles)) {
        throw new UnauthorizedException('Access token claims are invalid');
      }
      request.user = claims;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Access token is invalid or expired');
    }
  }
}

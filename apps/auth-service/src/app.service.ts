import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ActionTokenPurpose,
  Prisma,
  RoleName,
  User,
} from '../generated/index.js';
import argon2 from 'argon2';
import {
  createCipheriv,
  createHash,
  randomBytes,
  randomUUID,
} from 'node:crypto';
import type {
  AuthActionRequestedPayload,
  EventEnvelope,
} from '@pediritos/contracts';
import { PrismaService } from './prisma.service.js';

const userWithRoles = {
  userRoles: { include: { role: true } },
} satisfies Prisma.UserInclude;

type UserWithRoles = Prisma.UserGetPayload<{ include: typeof userWithRoles }>;
type Transaction = Prisma.TransactionClient;

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  user: PublicUser;
}

export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  roles: string[];
  createdAt: Date;
}

interface RefreshClaims {
  sub: string;
  jti: string;
  exp?: number;
}

@Injectable()
export class AppService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiresIn: string;
  private readonly refreshExpiresIn: string;
  private readonly actionEncryptionKey: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.accessSecret = config.getOrThrow<string>('JWT_SECRET');
    this.refreshSecret = config.getOrThrow<string>('JWT_REFRESH_SECRET');
    this.accessExpiresIn = config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m');
    this.refreshExpiresIn = config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    this.actionEncryptionKey = createHash('sha256')
      .update(config.getOrThrow<string>('AUTH_ACTION_ENCRYPTION_KEY'))
      .digest();
  }

  getHello(): { service: string; status: string } {
    return { service: 'auth-service', status: 'ok' };
  }

  async register(input: {
    email: string;
    displayName: string;
    password: string;
  }): Promise<TokenResponse> {
    const email = input.email.trim().toLowerCase();
    const passwordHash = await argon2.hash(input.password, {
      type: argon2.argon2id,
    });

    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const customerRole = await tx.role.upsert({
          where: { name: RoleName.CUSTOMER },
          create: { name: RoleName.CUSTOMER },
          update: {},
        });
        const created = await tx.user.create({
          data: {
            email,
            displayName: input.displayName.trim(),
            passwordHash,
            userRoles: { create: { roleId: customerRole.id } },
          },
          include: userWithRoles,
        });
        await this.createActionTokenAndEvent(
          tx,
          created,
          ActionTokenPurpose.EMAIL_VERIFICATION,
        );
        return created;
      });

      return this.createSession(user);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'An account with this email already exists',
        );
      }
      throw error;
    }
  }

  async login(emailInput: string, password: string): Promise<TokenResponse> {
    const email = emailInput.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: userWithRoles,
    });
    if (!user || user.disabledAt) {
      await argon2.hash(password, { type: argon2.argon2id });
      throw new UnauthorizedException('Email or password is incorrect');
    }

    const passwordMatches = await argon2.verify(user.passwordHash, password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Email or password is incorrect');
    }

    return this.createSession(user);
  }

  async refresh(refreshToken: string): Promise<TokenResponse> {
    const claims = await this.verifyRefreshToken(refreshToken);
    const previous = await this.prisma.refreshToken.findUnique({
      where: { jti: claims.jti },
      include: { user: { include: userWithRoles } },
    });
    const now = new Date();
    if (
      !previous ||
      previous.userId !== claims.sub ||
      previous.revokedAt ||
      previous.expiresAt <= now ||
      previous.tokenHash !== this.hashToken(refreshToken) ||
      previous.user.disabledAt
    ) {
      throw new UnauthorizedException(
        'Refresh token is invalid or has been rotated',
      );
    }

    const nextJti = randomUUID();
    const nextRefreshToken = await this.signRefreshToken(
      previous.userId,
      nextJti,
    );
    const nextRefreshExpiry = this.expiryFor(this.refreshExpiresIn);
    const accessToken = await this.signAccessToken(previous.user);

    const rotation = await this.prisma.$transaction(async (tx) => {
      const revoked = await tx.refreshToken.updateMany({
        where: { id: previous.id, revokedAt: null, expiresAt: { gt: now } },
        data: { revokedAt: now, replacedBy: nextJti },
      });
      if (revoked.count !== 1) return false;
      await tx.refreshToken.create({
        data: {
          userId: previous.userId,
          jti: nextJti,
          tokenHash: this.hashToken(nextRefreshToken),
          expiresAt: nextRefreshExpiry,
        },
      });
      return true;
    });
    if (!rotation) {
      throw new UnauthorizedException('Refresh token has already been rotated');
    }

    return this.tokenResponse(previous.user, accessToken, nextRefreshToken);
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      const claims = await this.verifyRefreshToken(refreshToken);
      await this.prisma.refreshToken.updateMany({
        where: {
          jti: claims.jti,
          userId: claims.sub,
          tokenHash: this.hashToken(refreshToken),
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    } catch {
      // Logout remains idempotent and does not reveal whether a token was valid.
    }
  }

  async getUser(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, disabledAt: null },
      include: userWithRoles,
    });
    if (!user) throw new UnauthorizedException('User account is unavailable');
    return this.toPublicUser(user);
  }

  async requestPasswordReset(emailInput: string): Promise<void> {
    const email = emailInput.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.disabledAt) return;
    await this.prisma.$transaction((tx) =>
      this.createActionTokenAndEvent(
        tx,
        user,
        ActionTokenPurpose.PASSWORD_RESET,
      ),
    );
  }

  async verifyEmail(token: string): Promise<void> {
    const action = await this.findValidActionToken(
      token,
      ActionTokenPurpose.EMAIL_VERIFICATION,
    );
    await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.actionToken.updateMany({
        where: {
          id: action.id,
          consumedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { consumedAt: new Date() },
      });
      if (consumed.count !== 1) {
        throw new UnauthorizedException(
          'Verification link is invalid or expired',
        );
      }
      await tx.user.update({
        where: { id: action.userId },
        data: { emailVerified: true },
      });
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const action = await this.findValidActionToken(
      token,
      ActionTokenPurpose.PASSWORD_RESET,
    );
    const passwordHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
    });
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.actionToken.updateMany({
        where: { id: action.id, consumedAt: null, expiresAt: { gt: now } },
        data: { consumedAt: now },
      });
      if (consumed.count !== 1) {
        throw new UnauthorizedException(
          'Password reset link is invalid or expired',
        );
      }
      await tx.user.update({
        where: { id: action.userId },
        data: { passwordHash },
      });
      await tx.refreshToken.updateMany({
        where: { userId: action.userId, revokedAt: null },
        data: { revokedAt: now },
      });
    });
  }

  private async createSession(user: UserWithRoles): Promise<TokenResponse> {
    const jti = randomUUID();
    const [accessToken, refreshToken] = await Promise.all([
      this.signAccessToken(user),
      this.signRefreshToken(user.id, jti),
    ]);
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        jti,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: this.expiryFor(this.refreshExpiresIn),
      },
    });
    return this.tokenResponse(user, accessToken, refreshToken);
  }

  private async signAccessToken(user: UserWithRoles): Promise<string> {
    return this.jwt.signAsync(
      {
        sub: user.id,
        email: user.email,
        roles: user.userRoles.map((link) => link.role.name),
      },
      {
        secret: this.accessSecret,
        expiresIn: this.accessExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
        issuer: 'pediritos-auth',
        audience: 'pediritos-api',
      },
    );
  }

  private async signRefreshToken(userId: string, jti: string): Promise<string> {
    return this.jwt.signAsync(
      { sub: userId, jti },
      {
        secret: this.refreshSecret,
        expiresIn: this.refreshExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
        issuer: 'pediritos-auth-refresh',
        audience: 'pediritos-auth-refresh',
      },
    );
  }

  private async verifyRefreshToken(token: string): Promise<RefreshClaims> {
    try {
      const claims = await this.jwt.verifyAsync<RefreshClaims>(token, {
        secret: this.refreshSecret,
        issuer: 'pediritos-auth-refresh',
        audience: 'pediritos-auth-refresh',
      });
      if (!claims.sub || !claims.jti || !claims.exp)
        throw new Error('Missing token claims');
      return claims;
    } catch {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }
  }

  private async createActionTokenAndEvent(
    tx: Transaction,
    user: Pick<User, 'id' | 'email'>,
    purpose: ActionTokenPurpose,
  ): Promise<void> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await tx.actionToken.create({
      data: {
        userId: user.id,
        purpose,
        tokenHash: this.hashToken(token),
        expiresAt,
      },
    });
    const eventType =
      purpose === ActionTokenPurpose.EMAIL_VERIFICATION
        ? 'auth.verification_requested'
        : 'auth.password_reset_requested';
    const event: EventEnvelope<AuthActionRequestedPayload> = {
      eventId: randomUUID(),
      eventType,
      eventVersion: 1,
      occurredAt: new Date().toISOString(),
      correlationId: randomUUID(),
      payload: {
        userId: user.id,
        email: user.email,
        encryptedToken: this.encryptActionToken(token),
      },
    };
    await tx.outboxEvent.create({
      data: {
        id: event.eventId,
        eventType,
        eventVersion: 1,
        routingKey: eventType,
        correlationId: event.correlationId,
        event: event as unknown as Prisma.InputJsonValue,
        occurredAt: new Date(event.occurredAt),
      },
    });
  }

  private async findValidActionToken(
    token: string,
    purpose: ActionTokenPurpose,
  ) {
    const action = await this.prisma.actionToken.findFirst({
      where: {
        tokenHash: this.hashToken(token),
        purpose,
        consumedAt: null,
        expiresAt: { gt: new Date() },
        user: { disabledAt: null },
      },
    });
    if (!action)
      throw new UnauthorizedException('Action link is invalid or expired');
    return action;
  }

  private tokenResponse(
    user: UserWithRoles,
    accessToken: string,
    refreshToken: string,
  ): TokenResponse {
    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.accessExpiresIn,
      user: this.toPublicUser(user),
    };
  }

  private toPublicUser(user: UserWithRoles): PublicUser {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      emailVerified: user.emailVerified,
      roles: user.userRoles.map((link) => link.role.name),
      createdAt: user.createdAt,
    };
  }

  private expiryFor(duration: string): Date {
    const match = /^(\d+)(s|m|h|d)$/.exec(duration);
    if (!match)
      throw new Error(
        'JWT expiry must use an integer followed by s, m, h, or d',
      );
    const amount = Number(match[1]);
    const milliseconds = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 }[
      match[2] as 's' | 'm' | 'h' | 'd'
    ];
    return new Date(Date.now() + amount * milliseconds);
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private encryptActionToken(token: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.actionEncryptionKey, iv);
    const ciphertext = Buffer.concat([
      cipher.update(token, 'utf8'),
      cipher.final(),
    ]);
    return [iv, cipher.getAuthTag(), ciphertext]
      .map((part) => part.toString('base64url'))
      .join('.');
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}

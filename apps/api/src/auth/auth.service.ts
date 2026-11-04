import { randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { DEFAULT_LOCALE, isLocale, type LoginRequest, type RegisterRequest } from '@yoyo/shared';
import { CLOCK, type Clock } from '../clock/clock';
import { AppError } from '../common/app-error';
import { ENV, type Env } from '../config/env';
import { type EmailToken, type EmailTokenType, Prisma, type User } from '../generated/prisma/client';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { AccessTokenService } from './access-token.service';
import type { SessionTokens } from './cookies';
import { PasswordService } from './password.service';
import { hashToken, RefreshTokenService, type SessionMeta } from './refresh-token.service';

const HOUR = 3_600_000;
/** The email confirmation link works for 24 hours. */
export const EMAIL_VERIFICATION_TTL_MS = 24 * HOUR;

const emailTaken = () => new AppError('AUTH_EMAIL_TAKEN', 409);
const invalidCredentials = () => new AppError('AUTH_INVALID_CREDENTIALS', 401);
const unauthenticated = () => new AppError('AUTH_UNAUTHENTICATED', 401);
const invalidLink = () =>
  new AppError('VALIDATION_FAILED', 400, 'This link is not valid', { token: 'This link is not valid' });

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

/** `https://site` + `/lv` (no prefix for English) + path + `?token=…`, matching the site's URL scheme. */
export function webLink(origin: string, locale: string, path: string, token: string): string {
  const prefix = isLocale(locale) && locale !== DEFAULT_LOCALE ? `/${locale}` : '';
  return `${origin}${prefix}${path}?token=${encodeURIComponent(token)}`;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly accessTokens: AccessTokenService,
    private readonly refreshTokens: RefreshTokenService,
    private readonly mail: MailService,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ENV) private readonly env: Pick<Env, 'WEB_ORIGIN'>,
  ) {}

  /** Creates the account, signs it in and emails the confirmation link (in the background). */
  async register(input: RegisterRequest, meta: SessionMeta): Promise<{ user: User; session: SessionTokens }> {
    if (await this.prisma.user.findUnique({ where: { email: input.email }, select: { id: true } })) {
      throw emailTaken();
    }
    const passwordHash = await this.passwords.hash(input.password);
    let user: User;
    try {
      user = await this.prisma.user.create({
        data: {
          email: input.email,
          passwordHash,
          name: input.name,
          locale: input.locale ?? DEFAULT_LOCALE,
          createdAt: this.clock.now(),
        },
      });
    } catch (error) {
      // Two registrations raced past the check above: the unique index decides.
      if (isUniqueViolation(error)) throw emailTaken();
      throw error;
    }
    const session = await this.startSession(user, meta);
    await this.sendVerification(user);
    return { user, session };
  }

  /** Marks the email confirmed. The link works once: every confirmation link of the user is used up. */
  async verifyEmail(token: string): Promise<User> {
    const row = await this.consumeEmailToken(token, 'VERIFY_EMAIL');
    const now = this.clock.now();
    await this.prisma.user.updateMany({
      where: { id: row.userId, emailVerifiedAt: null },
      data: { emailVerifiedAt: now },
    });
    await this.prisma.emailToken.updateMany({
      where: { userId: row.userId, type: 'VERIFY_EMAIL', usedAt: null },
      data: { usedAt: now },
    });
    return this.prisma.user.findUniqueOrThrow({ where: { id: row.userId } });
  }

  /**
   * Wrong password, unknown email and password-less accounts all get the same 401, after the same
   * argon2 work. Blocked accounts hear 403 only once the password was right.
   */
  async login(input: LoginRequest, meta: SessionMeta): Promise<{ user: User; session: SessionTokens }> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    const passwordOk = await this.passwords.verify(user?.passwordHash ?? null, input.password);
    if (!user || !passwordOk || user.deletedAt !== null) throw invalidCredentials();
    if (user.blockedAt !== null) throw new AppError('AUTH_BLOCKED', 403);
    return { user, session: await this.startSession(user, meta) };
  }

  /** Rotates the refresh token; blocked or deleted accounts lose the session instead. */
  async refresh(refreshToken: string, meta: SessionMeta): Promise<{ user: User; session: SessionTokens }> {
    const rotated = await this.refreshTokens.rotate(refreshToken, meta);
    const user = await this.prisma.user.findUnique({ where: { id: rotated.userId } });
    if (!user || user.deletedAt !== null || user.blockedAt !== null) {
      await this.refreshTokens.revokeFamily(rotated.token);
      if (user?.blockedAt) throw new AppError('AUTH_BLOCKED', 403);
      throw unauthenticated();
    }
    const accessToken = await this.accessTokens.issue(user);
    return { user, session: { accessToken, refreshToken: rotated.token } };
  }

  logout(refreshToken: string): Promise<void> {
    return this.refreshTokens.revokeFamily(refreshToken);
  }

  logoutEverywhere(userId: string): Promise<void> {
    return this.refreshTokens.revokeAll(userId);
  }

  /** A new confirmation link, unless the email is already confirmed. */
  async resendVerification(userId: string): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.emailVerifiedAt === null) await this.sendVerification(user);
  }

  async startSession(user: User, meta: SessionMeta): Promise<SessionTokens> {
    const [accessToken, refresh] = await Promise.all([
      this.accessTokens.issue(user),
      this.refreshTokens.issue(user.id, meta),
    ]);
    return { accessToken, refreshToken: refresh.token };
  }

  async sendVerification(user: User): Promise<void> {
    const token = await this.issueEmailToken(user.id, 'VERIFY_EMAIL', EMAIL_VERIFICATION_TTL_MS);
    void this.mail.sendVerifyEmail(user, webLink(this.env.WEB_ORIGIN, user.locale, '/verify-email', token));
  }

  private async issueEmailToken(userId: string, type: EmailTokenType, ttlMs: number): Promise<string> {
    const now = this.clock.now();
    const token = randomBytes(32).toString('base64url');
    await this.prisma.emailToken.create({
      data: { userId, type, tokenHash: hashToken(token), expiresAt: new Date(now.getTime() + ttlMs), createdAt: now },
    });
    return token;
  }

  /** Uses a link token exactly once: 410 TOKEN_USED when used before, 410 TOKEN_EXPIRED when too old. */
  private async consumeEmailToken(token: string, type: EmailTokenType): Promise<EmailToken> {
    const now = this.clock.now();
    const row = await this.prisma.emailToken.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!row || row.type !== type) throw invalidLink();
    if (row.usedAt !== null) throw new AppError('TOKEN_USED', 410);
    if (row.expiresAt <= now) throw new AppError('TOKEN_EXPIRED', 410);
    const claimed = await this.prisma.emailToken.updateMany({
      where: { id: row.id, usedAt: null },
      data: { usedAt: now },
    });
    if (claimed.count === 0) throw new AppError('TOKEN_USED', 410);
    return row;
  }
}

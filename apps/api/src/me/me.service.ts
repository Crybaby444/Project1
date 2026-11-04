import { Inject, Injectable } from '@nestjs/common';
import type { UpdateProfileRequest } from '@yoyo/shared';
import { AuthService } from '../auth/auth.service';
import type { SessionTokens } from '../auth/cookies';
import { PasswordService } from '../auth/password.service';
import { RefreshTokenService, type SessionMeta } from '../auth/refresh-token.service';
import { CLOCK, type Clock } from '../clock/clock';
import { AppError } from '../common/app-error';
import type { User } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const invalidCredentials = () => new AppError('AUTH_INVALID_CREDENTIALS', 401, 'Wrong password');

@Injectable()
export class MeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly refreshTokens: RefreshTokenService,
    private readonly auth: AuthService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  updateProfile(userId: string, patch: UpdateProfileRequest): Promise<User> {
    return this.prisma.user.update({ where: { id: userId }, data: patch });
  }

  /**
   * Changes the password and ends every session, then opens a fresh one for this device. (The
   * refresh cookie only travels to /auth, so the current session cannot be singled out here.)
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    meta: SessionMeta,
  ): Promise<{ user: User; session: SessionTokens }> {
    const current = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await this.passwords.verify(current.passwordHash, currentPassword))) throw invalidCredentials();
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await this.passwords.hash(newPassword) },
    });
    await this.refreshTokens.revokeAll(userId);
    return { user, session: await this.auth.startSession(user, meta) };
  }

  /**
   * Soft delete: the row stays (for records that point at it later), everything personal goes, the
   * email is freed for a new account, and the Google link is removed so it cannot sign back in.
   */
  async deleteAccount(userId: string, password: string | undefined): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.passwordHash !== null && !(password && (await this.passwords.verify(user.passwordHash, password)))) {
      throw invalidCredentials();
    }
    const now = this.clock.now();
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          email: `deleted+${userId}@yoyo.invalid`,
          name: 'Deleted user',
          passwordHash: null,
          city: null,
          about: null,
          phone: null,
          phoneVerifiedAt: null,
          emailVerifiedAt: null,
          deletedAt: now,
        },
      }),
      this.prisma.oAuthAccount.deleteMany({ where: { userId } }),
      this.prisma.emailToken.deleteMany({ where: { userId } }),
      this.prisma.phoneCode.deleteMany({ where: { userId } }),
    ]);
    await this.refreshTokens.revokeAll(userId);
  }
}

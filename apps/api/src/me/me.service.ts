import { Inject, Injectable } from '@nestjs/common';
import { ActivityService } from '../activity/activity.service';
import type { UpdateProfileRequest } from '@yoyo/shared';
import { AuthService } from '../auth/auth.service';
import type { SessionTokens } from '../auth/cookies';
import { PasswordService } from '../auth/password.service';
import { RefreshTokenService, type SessionMeta } from '../auth/refresh-token.service';
import { CLOCK, type Clock } from '../clock/clock';
import { assertUsernameFree } from '../auth/identity';
import { AppError } from '../common/app-error';
import { Prisma, type User } from '../generated/prisma/client';
import { ListingsService } from '../listings/listings.service';
import { PrismaService } from '../prisma/prisma.service';

const invalidCredentials = () => new AppError('AUTH_INVALID_CREDENTIALS', 401, 'Wrong password');

@Injectable()
export class MeService {
  constructor(
    private readonly activity: ActivityService,
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly refreshTokens: RefreshTokenService,
    private readonly auth: AuthService,
    private readonly listings: ListingsService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async updateProfile(userId: string, patch: UpdateProfileRequest): Promise<User> {
    const { adult, dataConsent, username, ...rest } = patch;
    const data: Prisma.UserUpdateInput = { ...rest };
    if (username !== undefined) {
      await assertUsernameFree(this.prisma, username, userId);
      data.username = username;
    }
    if (adult || dataConsent) {
      // Given once (owner, 2026-11-16): a tick already on file keeps its first date.
      const current = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { adultConfirmedAt: true, dataConsentAt: true } });
      if (adult && current.adultConfirmedAt === null) data.adultConfirmedAt = this.clock.now();
      if (dataConsent && current.dataConsentAt === null) data.dataConsentAt = this.clock.now();
    }
    try {
      return await this.prisma.user.update({ where: { id: userId }, data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' && username !== undefined) await assertUsernameFree(this.prisma, username, userId);
      throw error;
    }
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
   * Soft delete: the row stays (for records that point at it later), everything personal goes (incl.
   * the block reason and the sessions with their IP addresses and user agents), the email is freed for
   * a new account, and the Google link is removed so it cannot sign back in. Listings never published
   * are deleted with their photo files; the others are archived without their exact point.
   */
  async deleteAccount(userId: string, password: string | undefined): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.passwordHash !== null && !(password && (await this.passwords.verify(user.passwordHash, password)))) {
      throw invalidCredentials();
    }
    this.activity.record('USER_DELETED', userId, { type: 'USER', id: userId }, user.username ? `@${user.username}` : '');
    await this.erase(userId);
  }

  /** The deletion itself, without the password check: the person's own request, or an administrator's (audited there). */
  async erase(userId: string): Promise<void> {
    const now = this.clock.now();
    const photoKeys = await this.prisma.$transaction(async (tx) => {
      await assertNothingHeld(tx, userId);
      await tx.user.update({
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
          // Free text an admin wrote about the person; the block itself (blockedAt) stays on record.
          blockedReason: null,
          deletedAt: now,
        },
      });
      await tx.oAuthAccount.deleteMany({ where: { userId } });
      await tx.emailToken.deleteMany({ where: { userId } });
      await tx.phoneCode.deleteMany({ where: { userId } });
      // Ends every session and drops what sessions record about devices (IP address, user agent).
      await tx.refreshToken.deleteMany({ where: { userId } });
      // Listings leave the catalog and the review queue; the exact point (often a home address) goes.
      return this.listings.removeAllOf(userId, tx);
    });
    await this.listings.forgetFiles(photoKeys);
  }
}

/** Deals that still move money or an item: everything but the four endings. */
const OPEN_STATUSES = ['REQUESTED', 'ACCEPTED', 'PAID', 'ACTIVE', 'RETURNED', 'DAMAGE_CLAIMED', 'DISPUTED'] as const;

/**
 * An account cannot go while Yoyo still holds something of it (plan 8 review): an open deal on either
 * side (the other side's money and item depend on it), or money in the wallet (a deleted account can
 * never pay it out). 409 ACTION_NOT_ALLOWED with `details.why`.
 */
async function assertNothingHeld(tx: Prisma.TransactionClient, userId: string): Promise<void> {
  const openDeals = await tx.booking.count({
    where: { OR: [{ renterId: userId }, { ownerId: userId }], status: { in: [...OPEN_STATUSES] } },
  });
  if (openDeals > 0) {
    throw new AppError('ACTION_NOT_ALLOWED', 409, 'Finish or cancel your open deals first', undefined, { why: 'OPEN_DEALS', openDeals });
  }
  const wallet = await tx.ledgerAccount.findUnique({ where: { id: `wallet:${userId}` } });
  if (wallet && wallet.balance > 0) {
    throw new AppError('ACTION_NOT_ALLOWED', 409, 'Pay out the money in your wallet first', undefined, {
      why: 'WALLET_NOT_EMPTY',
      walletCents: wallet.balance,
    });
  }
}

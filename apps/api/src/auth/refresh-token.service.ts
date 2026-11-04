import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, type Clock } from '../clock/clock';
import { AppError } from '../common/app-error';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Refresh tokens (sessions) live 30 days from their last rotation. */
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface SessionMeta {
  userAgent?: string;
  ip?: string;
}

export interface IssuedRefreshToken {
  token: string;
  expiresAt: Date;
  /** The session the token belongs to; access tokens carry it as `sid`. */
  familyId: string;
}

/** SHA-256 (hex) of an opaque token: the only form in which tokens are stored. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

const unauthenticated = () => new AppError('AUTH_UNAUTHENTICATED', 401);

/**
 * Opaque refresh tokens with rotation. Every rotation replaces the token with a new one of the same
 * family; presenting a token that was already rotated (or revoked) means it was copied, so the whole
 * family — the thief's and the owner's session alike — is revoked.
 */
@Injectable()
export class RefreshTokenService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** Starts a new session (or continues `familyId`). */
  async issue(userId: string, meta: SessionMeta, familyId?: string): Promise<IssuedRefreshToken> {
    const { token, expiresAt, familyId: family } = await this.create(this.prisma, userId, meta, familyId ?? randomUUID());
    return { token, expiresAt, familyId: family };
  }

  /** Swaps a live token for a new one; throws 401 AUTH_UNAUTHENTICATED for anything else. */
  async rotate(token: string, meta: SessionMeta): Promise<IssuedRefreshToken & { userId: string }> {
    const now = this.clock.now();
    const current = await this.prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!current) throw unauthenticated();
    if (current.revokedAt !== null || current.replacedById !== null) {
      await this.revokeFamilyId(current.familyId);
      throw unauthenticated();
    }
    if (current.expiresAt <= now) throw unauthenticated();

    const next = await this.prisma.$transaction(async (tx) => {
      // Claim the token first: of two rotations racing on one token, only one can win.
      const claimed = await tx.refreshToken.updateMany({
        where: { id: current.id, revokedAt: null },
        data: { revokedAt: now },
      });
      if (claimed.count === 0) return null;
      const created = await this.create(tx, current.userId, meta, current.familyId);
      await tx.refreshToken.update({ where: { id: current.id }, data: { replacedById: created.id } });
      return created;
    });
    if (!next) {
      // The other rotation won, so this token was presented twice: treat it as reuse.
      await this.revokeFamilyId(current.familyId);
      throw unauthenticated();
    }
    return { userId: current.userId, token: next.token, expiresAt: next.expiresAt, familyId: next.familyId };
  }

  /**
   * Whether the session still has a live (not revoked, not expired) refresh token. Every way of ending
   * a session revokes its refresh tokens, so this is what tells the auth guard the session is over.
   */
  async isLive(userId: string, familyId: string): Promise<boolean> {
    const live = await this.prisma.refreshToken.findFirst({
      where: { familyId, userId, revokedAt: null, expiresAt: { gt: this.clock.now() } },
      select: { id: true },
    });
    return live !== null;
  }

  /** Ends the session the token belongs to (logout). Unknown tokens are ignored. */
  async revokeFamily(token: string): Promise<void> {
    const row = await this.prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(token) } });
    if (row) await this.revokeFamilyId(row.familyId);
  }

  /** Ends every session of a user (logout everywhere, password reset). */
  async revokeAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: this.clock.now() },
    });
  }

  private async revokeFamilyId(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: this.clock.now() },
    });
  }

  private async create(
    db: Prisma.TransactionClient,
    userId: string,
    meta: SessionMeta,
    familyId: string,
  ): Promise<IssuedRefreshToken & { id: string }> {
    const now = this.clock.now();
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_MS);
    const row = await db.refreshToken.create({
      data: {
        userId,
        familyId,
        tokenHash: hashToken(token),
        expiresAt,
        userAgent: meta.userAgent?.slice(0, 512) ?? null,
        ip: meta.ip?.slice(0, 64) ?? null,
        createdAt: now,
      },
    });
    return { id: row.id, token, expiresAt, familyId };
  }
}

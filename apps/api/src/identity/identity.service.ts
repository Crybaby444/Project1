import { Inject, Injectable } from '@nestjs/common';
import { ActivityService } from '../activity/activity.service';
import type { AdminIdentityQueue, IdentityDecision, IdentityDocument, IdentityState, PublicUser } from '@yoyo/shared';
import { AuditService } from '../audit/audit.service';
import { CLOCK, type Clock } from '../clock/clock';
import { AppError } from '../common/app-error';
import { ENV, type Env } from '../config/env';
import { MailService } from '../mail/mail.service';
import { checkImage, normalizePhoto } from '../media/image-check';
import { sitePath } from '../moderation/moderation.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { openPhoto, photoKey, sealPhoto } from './photo-crypto';

const notFound = () => new AppError('NOT_FOUND', 404, 'No such identity check');

/**
 * Identity checked by a moderator (owner, 2026-11-16): the person sends a document photo and a selfie
 * with explicit consent; both are re-encoded (no EXIF or GPS), encrypted and erased once a moderator
 * decides. Only the decision stays.
 */
@Injectable()
export class IdentityService {
  private readonly key: Buffer;

  constructor(
    private readonly activity: ActivityService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
    private readonly notifications: NotificationsService,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ENV) private readonly env: Env,
  ) {
    this.key = photoKey(env.IDENTITY_PHOTO_KEY, env.JWT_SECRET);
  }

  async state(userId: string): Promise<IdentityState> {
    const [user, last] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { identityVerifiedAt: true } }),
      this.prisma.identityCheck.findFirst({ where: { userId }, orderBy: { submittedAt: 'desc' } }),
    ]);
    const status = user.identityVerifiedAt !== null ? 'VERIFIED' : (last?.status ?? 'NONE');
    return {
      status: status === 'VERIFIED' && user.identityVerifiedAt === null ? 'NONE' : status,
      documentType: (last?.documentType as IdentityDocument | undefined) ?? null,
      refusal: status === 'REJECTED' ? (last?.reason ?? null) : null,
      submittedAt: last?.submittedAt.toISOString() ?? null,
      decidedAt: last?.decidedAt?.toISOString() ?? user.identityVerifiedAt?.toISOString() ?? null,
    };
  }

  async submit(userId: string, documentType: IdentityDocument, document: Buffer, selfie: Buffer): Promise<IdentityState> {
    const current = await this.state(userId);
    if (current.status === 'PENDING' || current.status === 'VERIFIED') {
      throw new AppError('INVALID_STATUS', 409, current.status === 'PENDING' ? 'Your check is already with a moderator' : 'Your identity is already confirmed');
    }
    const sealed = [];
    for (const photo of [document, selfie]) {
      await checkImage(photo);
      sealed.push(sealPhoto(this.key, (await normalizePhoto(photo)).data));
    }
    const now = this.clock.now();
    await this.prisma.identityCheck.create({
      data: { userId, documentType, documentPhoto: new Uint8Array(sealed[0]!), selfiePhoto: new Uint8Array(sealed[1]!), consentAt: now, submittedAt: now },
    });
    this.activity.record('IDENTITY_SUBMITTED', userId, { type: 'USER', id: userId }, documentType);
    return this.state(userId);
  }

  async queue(): Promise<AdminIdentityQueue> {
    const rows = await this.prisma.identityCheck.findMany({
      where: { status: 'PENDING' },
      orderBy: { submittedAt: 'asc' },
      take: 100,
      select: { id: true, documentType: true, submittedAt: true, user: { select: { id: true, name: true, email: true, birthDate: true } } },
    });
    return {
      items: rows.map((r) => ({
        id: r.id,
        documentType: r.documentType as IdentityDocument,
        submittedAt: r.submittedAt.toISOString(),
        user: { id: r.user.id, name: r.user.name, email: r.user.email, birthDate: r.user.birthDate?.toISOString().slice(0, 10) ?? null },
      })),
    };
  }

  /** One photo for the moderator; every look is written to the audit log. */
  async photo(id: string, which: 'document' | 'selfie', admin: PublicUser): Promise<Buffer> {
    const row = await this.prisma.identityCheck.findUnique({ where: { id }, select: { status: true, userId: true, documentPhoto: true, selfiePhoto: true } });
    const sealed = which === 'document' ? row?.documentPhoto : row?.selfiePhoto;
    if (!row || row.status !== 'PENDING' || !sealed) throw notFound();
    await this.audit.record(admin, { action: 'IDENTITY_VIEWED', targetType: 'IDENTITY', targetId: id, summary: `${which} of ${row.userId}` });
    return openPhoto(this.key, Buffer.from(sealed));
  }

  async decide(id: string, decision: IdentityDecision, admin: PublicUser): Promise<void> {
    const now = this.clock.now();
    const userId = await this.prisma.$transaction(async (tx) => {
      const row = await tx.identityCheck.findUnique({ where: { id }, select: { status: true, userId: true } });
      if (!row) throw notFound();
      if (row.status !== 'PENDING') throw new AppError('INVALID_STATUS', 409, 'This check has already been decided');
      const approve = decision.decision === 'approve';
      await tx.identityCheck.update({
        where: { id },
        // The photos go the moment the decision is made (GDPR data minimisation).
        data: { status: approve ? 'VERIFIED' : 'REJECTED', decidedAt: now, decidedById: admin.id, reason: approve ? null : (decision.reason ?? null), documentPhoto: null, selfiePhoto: null },
      });
      if (approve) await tx.user.update({ where: { id: row.userId }, data: { identityVerifiedAt: now } });
      return row.userId;
    });
    await this.audit.record(admin, {
      action: decision.decision === 'approve' ? 'IDENTITY_APPROVED' : 'IDENTITY_REJECTED',
      targetType: 'IDENTITY',
      targetId: id,
      summary: decision.reason ?? '',
    });
    await this.tell(userId, decision.decision === 'approve' ? null : (decision.reason ?? ''));
  }

  /** The bell and an email in the person's language (account mail: always sent). */
  private async tell(userId: string, reason: string | null): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt !== null) return;
    void this.notifications.notify([user.id], { kind: 'IDENTITY', event: reason === null ? 'VERIFIED' : 'REJECTED', title: reason ?? '' });
    void this.mail.sendIdentityDecision(user, { reason, link: sitePath(this.env.WEB_ORIGIN, user.locale, reason === null ? '/' : '/settings#identity') });
  }
}

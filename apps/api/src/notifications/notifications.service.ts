import { Inject, Injectable, Logger } from '@nestjs/common';
import { EMAIL_TOPICS, type EmailPreferences, type EmailTopic, type Notification, type NotificationKind, type NotificationList } from '@yoyo/shared';
import { CLOCK, type Clock } from '../clock/clock';
import { AppError } from '../common/app-error';
import type { Notification as Row } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** The bell shows this many, newest first. */
const LIST_LIMIT = 50;

export interface NewNotification {
  kind: NotificationKind;
  event: string;
  bookingId?: string | null;
  listingId?: string | null;
  title?: string | null;
}

const toView = (row: Row): Notification => ({
  id: row.id,
  kind: row.kind,
  event: row.event,
  bookingId: row.bookingId,
  listingId: row.listingId,
  title: row.title,
  createdAt: row.createdAt.toISOString(),
  readAt: row.readAt?.toISOString() ?? null,
});

/**
 * Bell notifications and email topics (plan 9, spec §4.7). Notifications are written where the emails
 * are sent, so the bell and the inbox tell the same story; a failure here never fails the step that
 * caused it (logged).
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger('Notifications');

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async notify(userIds: readonly string[], n: NewNotification): Promise<void> {
    if (userIds.length === 0) return;
    try {
      const createdAt = this.clock.now();
      await this.prisma.notification.createMany({
        data: userIds.map((userId) => ({
          userId,
          kind: n.kind,
          event: n.event,
          bookingId: n.bookingId ?? null,
          listingId: n.listingId ?? null,
          title: n.title ?? '',
          createdAt,
        })),
      });
    } catch (error) {
      this.logger.error(`notification ${n.kind}/${n.event} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async list(userId: string): Promise<NotificationList> {
    const [rows, unread] = await Promise.all([
      this.prisma.notification.findMany({ where: { userId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: LIST_LIMIT }),
      this.unread(userId),
    ]);
    return { unread, items: rows.map(toView) };
  }

  unread(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  async read(userId: string, id: string): Promise<void> {
    const done = await this.prisma.notification.updateMany({ where: { id, userId }, data: { readAt: this.clock.now() } });
    if (done.count === 0) throw new AppError('NOT_FOUND', 404, 'Notification not found');
  }

  async readAll(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: this.clock.now() } });
  }

  async preferences(userId: string): Promise<EmailPreferences> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { emailOff: true } });
    return { off: user.emailOff.filter((topic): topic is EmailTopic => (EMAIL_TOPICS as readonly string[]).includes(topic)) };
  }

  async setPreferences(userId: string, prefs: EmailPreferences): Promise<EmailPreferences> {
    const off = [...new Set(prefs.off)];
    await this.prisma.user.update({ where: { id: userId }, data: { emailOff: off } });
    return { off };
  }
}

/** Whether a person still wants email on `topic`. */
export const wantsEmail = (user: { emailOff: readonly string[] }, topic: EmailTopic): boolean => !user.emailOff.includes(topic);

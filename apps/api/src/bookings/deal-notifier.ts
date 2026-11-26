import { Inject, Injectable, Logger } from '@nestjs/common';
import { publicName } from '../common/public-name';
import { cents, formatMoney } from '@yoyo/domain';
import { isLocale, type Locale } from '@yoyo/shared';
import { formatDayInText as formatDay } from '../common/format';
import { ENV, type Env } from '../config/env';
import type { User } from '../generated/prisma/client';
import { MailService } from '../mail/mail.service';
import { dealRole, type ReminderTemplate } from '../mail/templates/deal-texts';
import { sitePath } from '../moderation/moderation.service';
import { NotificationsService, wantsEmail } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { dayOf } from './booking.store';
import type { DealNotice } from './effects.executor';

/** At most this many administrators get the email about one new dispute. */
const ADMIN_RECIPIENTS = 5;

const known = (locale: string): Locale => (isLocale(locale) ? locale : 'en');
const money = (amount: number, locale: string) => formatMoney(cents(amount), known(locale));

/**
 * Emails about deals and price offers (spec §4.7), after the change is committed, in each recipient's
 * language, through MailService and its daily budget. Deleted accounts get nothing. A failure here is
 * logged and never undoes or fails the step.
 */
@Injectable()
export class DealNotifier {
  private readonly logger = new Logger('DealNotifier');

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly notifications: NotificationsService,
    @Inject(ENV) private readonly env: Pick<Env, 'WEB_ORIGIN'>,
  ) {}

  /** The steps of a deal (`DealNotice`s from the domain) and the timers' reminders (RemindersService). */
  async booking(notices: readonly (Omit<DealNotice, 'template'> & { template: DealNotice['template'] | ReminderTemplate })[]): Promise<void> {
    if (notices.length === 0) return;
    try {
      const booking = await this.prisma.booking.findUniqueOrThrow({
        where: { id: notices[0]!.bookingId },
        include: { listing: true, renter: true, owner: true },
      });
      const start = dayOf(booking.start);
      const end = dayOf(booking.end);
      const title = booking.listing.title ?? '';
      for (const notice of notices) {
        const recipients = await this.recipients(notice.to, booking.renter, booking.owner);
        await this.notifications.notify(
          recipients.map((user) => user.id),
          { kind: 'DEAL', event: notice.template, bookingId: booking.id, listingId: booking.listingId, title },
        );
        for (const user of recipients.filter((u) => wantsEmail(u, 'DEALS'))) {
          const other = publicName(user.id === booking.renterId ? booking.owner : booking.renter);
          const path = notice.to === 'ADMINS' ? `/admin/disputes/${booking.id}` : `/bookings/${booking.id}`;
          void this.mail.sendDealEvent(user, {
            template: notice.template,
            role: dealRole(notice.to),
            values: (locale) => ({
              title,
              start: formatDay(start, locale),
              end: formatDay(end, locale),
              total: money(booking.totalCents, locale),
              rent: money(booking.rentCents, locale),
              deposit: money(booking.depositCents, locale),
              other,
              price: money(booking.dailyCents, locale),
            }),
            summary: (locale) => ({
              item: title,
              dates: `${formatDay(start, locale)} – ${formatDay(end, locale)}`,
              total: money(booking.totalCents, locale),
            }),
            link: sitePath(this.env.WEB_ORIGIN, user.locale, path),
            button: 'button',
          });
        }
      }
    } catch (error) {
      this.logger.error(`deal emails for ${notices[0]?.bookingId} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /** OFFER_MADE goes to the owner; OFFER_ACCEPTED and OFFER_DECLINED to the renter. */
  async offer(template: 'OFFER_MADE' | 'OFFER_ACCEPTED' | 'OFFER_DECLINED', offerId: string): Promise<void> {
    try {
      const offer = await this.prisma.offer.findUniqueOrThrow({ where: { id: offerId }, include: { listing: true, renter: true, owner: true } });
      const toOwner = template === 'OFFER_MADE';
      const user = toOwner ? offer.owner : offer.renter;
      if (user.deletedAt !== null) return;
      await this.notifications.notify([user.id], { kind: 'OFFER', event: template, listingId: offer.listingId, title: offer.listing.title });
      if (!wantsEmail(user, 'OFFERS')) return;
      const start = dayOf(offer.start);
      const end = dayOf(offer.end);
      const title = offer.listing.title ?? '';
      void this.mail.sendDealEvent(user, {
        template,
        role: toOwner ? 'owner' : 'renter',
        values: (locale) => ({
          title,
          start: formatDay(start, locale),
          end: formatDay(end, locale),
          total: '',
          rent: '',
          deposit: '',
          other: publicName(toOwner ? offer.renter : offer.owner),
          price: money(offer.dailyCents, locale),
        }),
        summary: (locale) => ({ item: title, dates: `${formatDay(start, locale)} – ${formatDay(end, locale)}`, total: null }),
        link: sitePath(this.env.WEB_ORIGIN, user.locale, `/items/${offer.listingId}`),
        button: 'offerButton',
      });
    } catch (error) {
      this.logger.error(`offer email for ${offerId} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async recipients(to: DealNotice['to'], renter: User, owner: User): Promise<User[]> {
    const users =
      to === 'RENTER'
        ? [renter]
        : to === 'OWNER'
          ? [owner]
          : await this.prisma.user.findMany({
              where: { role: 'ADMIN', deletedAt: null, blockedAt: null },
              orderBy: { createdAt: 'asc' },
              take: ADMIN_RECIPIENTS,
            });
    return users.filter((user) => user.deletedAt === null);
  }
}

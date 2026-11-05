import { Inject, Injectable } from '@nestjs/common';
import { isLocale, type Locale, type PublicUser } from '@yoyo/shared';
import { bookingNotFound } from '../bookings/booking-errors';
import type { ContractTerms } from '../bookings/effects.executor';
import { CLOCK, type Clock } from '../clock/clock';
import { PrismaService } from '../prisma/prisma.service';
import { renderContract } from './contract.pdf';

/** The rental contract of a deal, drawn on request in the reader's language (spec §4.9). */
@Injectable()
export class ContractService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** The PDF for one side or an administrator; 404 for anyone else and before the owner accepts. */
  async pdf(bookingId: string, viewer: PublicUser, lang?: Locale): Promise<Buffer> {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId }, include: { contract: true } });
    const allowed = booking && (booking.renterId === viewer.id || booking.ownerId === viewer.id || viewer.role === 'ADMIN');
    if (!booking || !allowed || !booking.contract) throw bookingNotFound();
    return renderContract({
      terms: booking.contract.terms as unknown as ContractTerms,
      termsHash: booking.contract.termsHash,
      renterSignedAt: booking.renterSignedAt,
      ownerSignedAt: booking.ownerSignedAt,
      locale: lang ?? (isLocale(viewer.locale) ? viewer.locale : 'en'),
      now: this.clock.now(),
    });
  }
}

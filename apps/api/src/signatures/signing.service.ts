import { Inject, Injectable, Logger } from '@nestjs/common';
import type { PublicUser, SigningCheck, SigningStart } from '@yoyo/shared';
import { BookingsService } from '../bookings/bookings.service';
import { CLOCK, type Clock } from '../clock/clock';
import { AppError } from '../common/app-error';
import { ENV, type Env } from '../config/env';
import { ContractService } from '../contracts/contract.service';
import { PrismaService } from '../prisma/prisma.service';
import { toPublicUser } from '../auth/public-user';
import { SIGNATURE_PROVIDER, type SignatureProvider } from './signature.provider';

/** "Anna Maria Bērziņa" → name "Anna Maria", surname "Bērziņa" (a single word is both). */
export function splitName(full: string): { name: string; surname: string } {
  const words = full.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return { name: words[0] ?? '-', surname: words[0] ?? '-' };
  return { name: words.slice(0, -1).join(' '), surname: words.at(-1)! };
}

/**
 * Signing a contract through the provider (SIGNATURES=dokobit). Start: the contract PDF goes to the provider
 * and the person gets its page. Confirm (the provider's postback, or the site checking when the person comes
 * back): the provider's own status decides; then the deal takes the SIGN step for that person, once.
 */
@Injectable()
export class SigningService {
  private readonly logger = new Logger('Signing');

  constructor(
    private readonly prisma: PrismaService,
    private readonly bookings: BookingsService,
    private readonly contracts: ContractService,
    @Inject(SIGNATURE_PROVIDER) private readonly provider: SignatureProvider | null,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ENV) private readonly env: Pick<Env, 'API_PUBLIC_URL'>,
  ) {}

  private need(): SignatureProvider {
    if (!this.provider) throw new AppError('ACTION_NOT_ALLOWED', 409, 'Contracts are signed by typing the full name', undefined, { why: 'NO_SIGNING_PROVIDER' });
    return this.provider;
  }

  async start(bookingId: string, user: PublicUser): Promise<SigningStart> {
    const provider = this.need();
    const view = await this.bookings.view(bookingId, user);
    if (!view.actions.includes('SIGN')) throw new AppError('ACTION_NOT_ALLOWED', 409, 'There is nothing to sign now', undefined, { why: 'NOT_YOUR_TURN' });
    const row = await this.prisma.booking.findUniqueOrThrow({ where: { id: bookingId }, select: { renterId: true, contract: { select: { termsHash: true } } } });
    if (!row.contract) throw new AppError('ACTION_NOT_ALLOWED', 409, 'There is no contract yet');
    const side = row.renterId === user.id ? 'RENTER' : 'OWNER';
    const language = user.locale;
    const pdf = await this.contracts.pdf(bookingId, user, language);
    const started = await provider.start({
      title: `Yoyo rental contract ${bookingId.slice(-8).toUpperCase()}`,
      language,
      pdf,
      fileName: `yoyo-contract-${bookingId.slice(-8)}.pdf`,
      signer: { id: user.id, ...splitName(user.name) },
      postbackUrl: `${this.env.API_PUBLIC_URL ?? ''}/api/v1/signatures/dokobit/postback`,
    });
    await this.prisma.signingSession.create({
      data: { bookingId, side, userId: user.id, provider: provider.name, token: started.token, termsHash: row.contract.termsHash, createdAt: this.clock.now() },
    });
    return { url: started.url };
  }

  /** The provider says (or the person's page asks) a signing moved: record it if the provider confirms. */
  async confirm(token: string): Promise<'SIGNED' | 'PENDING' | 'FAILED' | 'UNKNOWN'> {
    const provider = this.need();
    const session = await this.prisma.signingSession.findUnique({ where: { token } });
    if (!session) return 'UNKNOWN';
    if (session.completedAt) return 'SIGNED';
    const state = await provider.state(token, session.userId);
    if (state.status !== 'SIGNED') return state.status;
    const contract = await this.prisma.contract.findUnique({ where: { bookingId: session.bookingId } });
    // Terms changed since this signing started: it covers old terms, so it does not count.
    if (contract?.termsHash !== session.termsHash) return 'FAILED';
    // Claim it first, so a postback and the page's check never record it twice.
    const claimed = await this.prisma.signingSession.updateMany({ where: { id: session.id, completedAt: null }, data: { completedAt: this.clock.now() } });
    if (claimed.count === 0) return 'SIGNED';
    const userRow = await this.prisma.user.findUniqueOrThrow({ where: { id: session.userId } });
    const user = toPublicUser(userRow);
    try {
      const booking = await this.prisma.booking.findUniqueOrThrow({ where: { id: session.bookingId }, select: { version: true } });
      await this.bookings.act(session.bookingId, user, booking.version, { type: 'SIGN', fullName: user.name }, { ip: 'signing-provider', userAgent: provider.name, method: state.method });
    } catch (error) {
      await this.prisma.signingSession.update({ where: { id: session.id }, data: { completedAt: null } });
      this.logger.error(`recording the signature of ${session.bookingId} failed: ${String(error)}`);
      throw error;
    }
    return 'SIGNED';
  }

  /** The person's own check when they come back from the provider's page. */
  async check(bookingId: string, user: PublicUser): Promise<SigningCheck> {
    const session = await this.prisma.signingSession.findFirst({ where: { bookingId, userId: user.id }, orderBy: { createdAt: 'desc' } });
    return { state: session ? await this.confirm(session.token) : 'UNKNOWN' };
  }
}

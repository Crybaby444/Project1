import type { Locale } from '@yoyo/shared';

/** What a signing provider is asked to have signed: one person, one PDF. */
export interface SigningRequest {
  /** Shown as the signing's title. */
  title: string;
  language: Locale;
  pdf: Buffer;
  fileName: string;
  /** `id` is Yoyo's user id; the provider asks for the person's eID itself. */
  signer: { id: string; name: string; surname: string };
  postbackUrl: string;
}

export interface StartedSigning {
  /** The provider's signing token: how its callbacks and status name this signing. */
  token: string;
  /** The page where this signer signs (embedded or opened by the site). */
  url: string;
}

/** What the provider itself says about a signing: only `SIGNED` records a signature. */
export type SigningState = { status: 'PENDING' } | { status: 'SIGNED'; method: string } | { status: 'FAILED'; reason: string };

/**
 * A qualified/advanced e-signature provider (audit 2026-11-16, C1). Today's default needs none: the typed
 * name is a simple electronic signature recorded by Yoyo. With SIGNATURES=dokobit the site signs through
 * the provider's page and Yoyo records the signature only after asking the provider (never trusting a
 * callback's body).
 */
export interface SignatureProvider {
  readonly name: string;
  start(request: SigningRequest): Promise<StartedSigning>;
  state(token: string, signerId: string): Promise<SigningState>;
}

export const SIGNATURE_PROVIDER = Symbol('SIGNATURE_PROVIDER');

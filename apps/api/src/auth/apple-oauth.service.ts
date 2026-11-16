import { randomBytes } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { EmailSchema } from '@yoyo/shared';
import { createRemoteJWKSet, importPKCS8, jwtVerify, SignJWT, type JWTPayload } from 'jose';
import { CLOCK, type Clock } from '../clock/clock';
import { AppError } from '../common/app-error';
import { ENV, type Env } from '../config/env';
import type { GoogleIdentity } from './google-oauth.service';

/** The cookie that remembers one Apple sign-in attempt; SameSite=None, since Apple comes back by a cross-site POST. */
export const APPLE_COOKIE = 'yoyo_oauth_apple';
export const APPLE_COOKIE_PATH = '/api/v1/auth/apple';
export const APPLE_STATE_TTL_SECONDS = 600;

/**
 * Apple returns by a cross-site POST, which carries only SameSite=None cookies, and those must be Secure.
 * Over plain http (local development, tests) a Secure cookie is never sent back, so there it is Lax.
 */
export function appleCookieOptions(secure: boolean, maxAgeSeconds: number) {
  return { httpOnly: true, sameSite: secure ? ('none' as const) : ('lax' as const), secure, path: APPLE_COOKIE_PATH, maxAge: maxAgeSeconds * 1000 };
}
const STATE_AUDIENCE = 'yoyo:apple-state';
const APPLE_ISSUER = 'https://appleid.apple.com';

export interface AppleAttempt {
  state: string;
  nonce: string;
  returnTo: string;
}

const badState = () => new AppError('VALIDATION_FAILED', 400, 'This Apple sign-in expired or was started elsewhere', { state: 'Sign-in attempt not recognised' });
const appleRefused = (message = 'Apple sign-in failed') => new AppError('AUTH_UNAUTHENTICATED', 401, message);
const seconds = (date: Date) => Math.floor(date.getTime() / 1000);

/** The name Apple posts once, on the first sign-in: `{"name":{"firstName":"Anna","lastName":"Bērziņa"}}`. */
export function nameFromAppleUser(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { name?: { firstName?: unknown; lastName?: unknown } };
    const parts = [parsed.name?.firstName, parsed.name?.lastName].filter((part): part is string => typeof part === 'string' && part.trim() !== '');
    return parts.length > 0 ? parts.join(' ').trim() : null;
  } catch {
    return null;
  }
}

/**
 * "Sign in with Apple" (owner, 2026-11-16): the authorization-code flow with state and nonce, the answer
 * posted back (`response_mode=form_post`, needed for the name and email scopes). The client secret is
 * an ES256 JWT signed with the team's .p8 key; the id_token is checked against Apple's keys.
 */
@Injectable()
export class AppleOAuthService {
  private readonly key: Uint8Array;
  private jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {
    this.key = new TextEncoder().encode(env.JWT_SECRET);
    const set = [env.APPLE_CLIENT_ID, env.APPLE_TEAM_ID, env.APPLE_KEY_ID, env.APPLE_PRIVATE_KEY].filter(Boolean).length;
    if (set > 0 && set < 4) new Logger('AppleOAuth').warn('Apple sign-in is off: set APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID and APPLE_PRIVATE_KEY');
  }

  get enabled(): boolean {
    return Boolean(this.env.APPLE_CLIENT_ID && this.env.APPLE_TEAM_ID && this.env.APPLE_KEY_ID && this.env.APPLE_PRIVATE_KEY);
  }

  get redirectUri(): string {
    return `${this.env.WEB_ORIGIN}/api/v1/auth/apple/callback`;
  }

  async start(returnTo: string): Promise<{ url: string; cookie: string }> {
    const attempt: AppleAttempt = { state: randomBytes(16).toString('base64url'), nonce: randomBytes(16).toString('base64url'), returnTo };
    const url = new URL(this.env.APPLE_AUTH_URL);
    url.search = new URLSearchParams({
      client_id: this.env.APPLE_CLIENT_ID!,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      response_mode: 'form_post',
      scope: 'name email',
      state: attempt.state,
      nonce: attempt.nonce,
    }).toString();
    const now = seconds(this.clock.now());
    const cookie = await new SignJWT({ ...attempt })
      .setProtectedHeader({ alg: 'HS256' })
      .setAudience(STATE_AUDIENCE)
      .setIssuedAt(now)
      .setExpirationTime(now + APPLE_STATE_TTL_SECONDS)
      .sign(this.key);
    return { url: url.toString(), cookie };
  }

  async readAttempt(cookie: string | undefined, state: string | undefined): Promise<AppleAttempt> {
    if (!cookie || !state) throw badState();
    let payload: JWTPayload;
    try {
      ({ payload } = await jwtVerify(cookie, this.key, { algorithms: ['HS256'], audience: STATE_AUDIENCE, currentDate: this.clock.now() }));
    } catch {
      throw badState();
    }
    const { nonce, returnTo } = payload;
    if (payload['state'] !== state || typeof nonce !== 'string' || typeof returnTo !== 'string') throw badState();
    return { state, nonce, returnTo };
  }

  /** Apple's client secret: an ES256 JWT from the team, about this Services ID, valid a few minutes. */
  private async clientSecret(): Promise<string> {
    const pem = this.env.APPLE_PRIVATE_KEY!.replace(/\\n/g, '\n');
    const key = await importPKCS8(pem, 'ES256');
    const now = seconds(this.clock.now());
    return new SignJWT({})
      .setProtectedHeader({ alg: 'ES256', kid: this.env.APPLE_KEY_ID! })
      .setIssuer(this.env.APPLE_TEAM_ID!)
      .setSubject(this.env.APPLE_CLIENT_ID!)
      .setAudience(APPLE_ISSUER)
      .setIssuedAt(now)
      .setExpirationTime(now + 300)
      .sign(key);
  }

  /** Trades the code for Apple's id_token and checks it: signature, issuer, audience, expiry, nonce, a verified email. */
  async identify(code: string, attempt: AppleAttempt, userField: string | undefined): Promise<GoogleIdentity> {
    const response = await fetch(this.env.APPLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: this.env.APPLE_CLIENT_ID!,
        client_secret: await this.clientSecret(),
        redirect_uri: this.redirectUri,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw appleRefused();
    const { id_token: idToken } = (await response.json()) as { id_token?: unknown };
    if (typeof idToken !== 'string') throw appleRefused();
    this.jwks ??= createRemoteJWKSet(new URL(this.env.APPLE_JWKS_URL), { timeoutDuration: 5000 });
    let claims: JWTPayload;
    try {
      ({ payload: claims } = await jwtVerify(idToken, this.jwks, { algorithms: ['RS256'], issuer: APPLE_ISSUER, audience: this.env.APPLE_CLIENT_ID!, currentDate: this.clock.now() }));
    } catch {
      throw appleRefused();
    }
    if (claims['nonce'] !== attempt.nonce || typeof claims.sub !== 'string') throw appleRefused();
    const verified = claims['email_verified'];
    if (verified !== true && verified !== 'true') throw appleRefused('Apple has not verified this email address');
    const email = EmailSchema.safeParse(claims['email']);
    if (!email.success) throw appleRefused();
    return { sub: claims.sub, email: email.data, name: nameFromAppleUser(userField) };
  }
}

import { createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { EmailSchema, safeSitePath } from '@yoyo/shared';
import { createRemoteJWKSet, jwtVerify, SignJWT, type JWTPayload } from 'jose';
import { CLOCK, type Clock } from '../clock/clock';
import { AppError } from '../common/app-error';
import { ENV, type Env } from '../config/env';

/** Name and path of the cookie that remembers one sign-in attempt between our redirect and Google's. */
export const OAUTH_COOKIE = 'yoyo_oauth';
export const OAUTH_COOKIE_PATH = '/api/v1/auth/google';
/** A sign-in attempt must come back from Google within 10 minutes. */
export const OAUTH_STATE_TTL_SECONDS = 600;

const STATE_AUDIENCE = 'yoyo:google-state';
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

export interface GoogleIdentity {
  /** Google's stable account id. */
  sub: string;
  /** Normalized (trimmed, lowercase), verified by Google. */
  email: string;
  name: string | null;
}

/** What start() remembered for the callback. */
export interface OAuthAttempt {
  state: string;
  verifier: string;
  nonce: string;
  returnTo: string;
}

const badState = () =>
  new AppError('VALIDATION_FAILED', 400, 'This Google sign-in expired or was started elsewhere; start it again', {
    state: 'Sign-in attempt not recognised',
  });
const googleRefused = (message = 'Google sign-in failed') => new AppError('AUTH_UNAUTHENTICATED', 401, message);

const seconds = (date: Date) => Math.floor(date.getTime() / 1000);

/**
 * "Sign in with Google" as an OAuth 2.0 authorization-code flow with PKCE (S256), state and nonce.
 * The attempt (state, PKCE verifier, nonce, returnTo) travels in a signed, 10-minute cookie, so the
 * server keeps nothing between the two redirects.
 */
@Injectable()
export class GoogleOAuthService {
  private readonly key: Uint8Array;
  private jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {
    this.key = new TextEncoder().encode(env.JWT_SECRET);
    if (Boolean(env.GOOGLE_CLIENT_ID) !== Boolean(env.GOOGLE_CLIENT_SECRET)) {
      new Logger('GoogleOAuth').warn('Google sign-in is off: set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
    }
  }

  get enabled(): boolean {
    return Boolean(this.env.GOOGLE_CLIENT_ID && this.env.GOOGLE_CLIENT_SECRET);
  }

  /** Google sends the user back through the site's /api proxy, so every cookie stays first-party. */
  get redirectUri(): string {
    return `${this.env.WEB_ORIGIN}/api/v1/auth/google/callback`;
  }

  /** The Google consent URL and the cookie value that remembers this attempt. */
  async start(returnTo: string): Promise<{ url: string; cookie: string }> {
    const attempt: OAuthAttempt = {
      state: randomBytes(16).toString('base64url'),
      verifier: randomBytes(32).toString('base64url'),
      nonce: randomBytes(16).toString('base64url'),
      returnTo,
    };
    const url = new URL(this.env.GOOGLE_AUTH_URL);
    url.search = new URLSearchParams({
      client_id: this.env.GOOGLE_CLIENT_ID!,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state: attempt.state,
      code_challenge: createHash('sha256').update(attempt.verifier).digest('base64url'),
      code_challenge_method: 'S256',
      nonce: attempt.nonce,
    }).toString();

    const now = seconds(this.clock.now());
    const cookie = await new SignJWT({ ...attempt })
      .setProtectedHeader({ alg: 'HS256' })
      .setAudience(STATE_AUDIENCE)
      .setIssuedAt(now)
      .setExpirationTime(now + OAUTH_STATE_TTL_SECONDS)
      .sign(this.key);
    return { url: url.toString(), cookie };
  }

  /** The attempt behind the callback, if its cookie is genuine, fresh and carries the same `state`; else 400. */
  async readAttempt(cookie: string | undefined, state: string | undefined): Promise<OAuthAttempt> {
    if (!cookie || !state) throw badState();
    let payload: JWTPayload;
    try {
      ({ payload } = await jwtVerify(cookie, this.key, {
        algorithms: ['HS256'],
        audience: STATE_AUDIENCE,
        currentDate: this.clock.now(),
      }));
    } catch {
      throw badState();
    }
    const { verifier, nonce, returnTo } = payload;
    if (payload['state'] !== state || typeof verifier !== 'string' || typeof nonce !== 'string' || typeof returnTo !== 'string') {
      throw badState();
    }
    return { state, verifier, nonce, returnTo };
  }

  /** Trades the code for Google's id_token and checks it: signature, issuer, audience, expiry, nonce, verified email. */
  async identify(code: string, attempt: OAuthAttempt): Promise<GoogleIdentity> {
    const response = await fetch(this.env.GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: this.env.GOOGLE_CLIENT_ID!,
        client_secret: this.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: this.redirectUri,
        code_verifier: attempt.verifier,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw googleRefused();
    const { id_token: idToken } = (await response.json()) as { id_token?: unknown };
    if (typeof idToken !== 'string') throw googleRefused();

    this.jwks ??= createRemoteJWKSet(new URL(this.env.GOOGLE_JWKS_URL), { timeoutDuration: 5000 });
    let claims: JWTPayload;
    try {
      ({ payload: claims } = await jwtVerify(idToken, this.jwks, {
        algorithms: ['RS256'],
        issuer: GOOGLE_ISSUERS,
        audience: this.env.GOOGLE_CLIENT_ID!,
        currentDate: this.clock.now(),
      }));
    } catch {
      throw googleRefused();
    }
    if (claims['nonce'] !== attempt.nonce || typeof claims.sub !== 'string') throw googleRefused();
    const verified = claims['email_verified'];
    if (verified !== true && verified !== 'true') throw googleRefused('Google has not verified this email address');
    const email = EmailSchema.safeParse(claims['email']);
    if (!email.success) throw googleRefused();
    const name = typeof claims['name'] === 'string' ? claims['name'] : null;
    return { sub: claims.sub, email: email.data, name };
  }
}

/** Only a path on the site: `/…`, never `//host`, `/\\host`, a full URL or control characters (shared with the site). */
export const safeReturnTo = (value: string | undefined): string => safeSitePath(value);

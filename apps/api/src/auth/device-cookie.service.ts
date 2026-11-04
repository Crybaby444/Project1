import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { jwtVerify, SignJWT } from 'jose';
import { CLOCK, type Clock } from '../clock/clock';
import { ENV, type Env } from '../config/env';

/** A browser that signed in to an account remembers it for a year. */
export const DEVICE_COOKIE_TTL_SECONDS = 365 * 24 * 60 * 60;
/** Audience claim that tells device cookies apart from access tokens and other JWTs. */
const AUDIENCE = 'yoyo:device';

export interface Device {
  userId: string;
  deviceId: string;
}

/**
 * Device cookies (OWASP "Slow down online guessing attacks with device cookies"): after a successful
 * sign-in the browser gets a signed `{ sub: userId, did: deviceId }`. Login attempts that present a
 * valid one for the same account are counted per device, so filling the per-email bucket with wrong
 * passwords does not lock the owner out.
 */
@Injectable()
export class DeviceCookieService {
  private readonly key: Uint8Array;

  constructor(
    @Inject(ENV) env: Pick<Env, 'JWT_SECRET'>,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {
    this.key = new TextEncoder().encode(env.JWT_SECRET);
  }

  /** A fresh cookie value for this user; keeps `deviceId` when the browser already had one. */
  issue(userId: string, deviceId: string = randomUUID()): Promise<string> {
    const now = Math.floor(this.clock.now().getTime() / 1000);
    return new SignJWT({ did: deviceId })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(userId)
      .setAudience(AUDIENCE)
      .setIssuedAt(now)
      .setExpirationTime(now + DEVICE_COOKIE_TTL_SECONDS)
      .sign(this.key);
  }

  /** The device behind a cookie value, or null for anything missing, forged, expired or foreign. */
  async read(cookie: string | undefined): Promise<Device | null> {
    if (!cookie) return null;
    try {
      const { payload } = await jwtVerify(cookie, this.key, {
        algorithms: ['HS256'],
        audience: AUDIENCE,
        currentDate: this.clock.now(),
      });
      const { sub, did } = payload;
      if (typeof sub !== 'string' || typeof did !== 'string' || !sub || !did) return null;
      return { userId: sub, deviceId: did };
    } catch {
      return null;
    }
  }
}

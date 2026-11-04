import { SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import { FakeClock } from '../../test/support/fake-clock';
import { AccessTokenService } from './access-token.service';

const SECRET = 'a-test-secret-that-is-long-enough-for-hs256';

function setup() {
  const clock = new FakeClock(new Date('2026-11-03T10:00:00.000Z'));
  return { clock, tokens: new AccessTokenService({ JWT_SECRET: SECRET }, clock) };
}

describe('AccessTokenService', () => {
  it('issues a token that verifies back to its subject and role', async () => {
    const { tokens } = setup();
    const at = await tokens.issue({ id: 'u1', role: 'USER' });
    expect(await tokens.verify(at)).toEqual({ sub: 'u1', role: 'USER' });
  });

  it('keeps a token valid for 15 minutes and calls it expired right after', async () => {
    const { clock, tokens } = setup();
    const at = await tokens.issue({ id: 'u1', role: 'ADMIN' });
    clock.advance(15 * 60_000 - 1_000);
    expect(await tokens.verify(at)).toEqual({ sub: 'u1', role: 'ADMIN' });
    clock.advance(1_001);
    await expect(tokens.verify(at)).rejects.toMatchObject({ code: 'TOKEN_EXPIRED', status: 401 });
  });

  it('rejects a tampered token as unauthenticated', async () => {
    const { tokens } = setup();
    const at = await tokens.issue({ id: 'u1', role: 'USER' });
    const tampered = at.slice(0, -2) + (at.endsWith('xx') ? 'yy' : 'xx');
    await expect(tokens.verify(tampered)).rejects.toMatchObject({ code: 'AUTH_UNAUTHENTICATED', status: 401 });
    await expect(tokens.verify('garbage')).rejects.toMatchObject({ code: 'AUTH_UNAUTHENTICATED' });
  });

  it('rejects a token signed with another secret', async () => {
    const { clock, tokens } = setup();
    const foreign = new AccessTokenService({ JWT_SECRET: 'another-secret-that-is-long-enough-for-hs256' }, clock);
    await expect(tokens.verify(await foreign.issue({ id: 'u1', role: 'USER' }))).rejects.toMatchObject({
      code: 'AUTH_UNAUTHENTICATED',
    });
  });

  it('rejects a correctly signed JWT that is not an access token or claims an unknown role', async () => {
    const { clock, tokens } = setup();
    const key = new TextEncoder().encode(SECRET);
    const now = Math.floor(clock.now().getTime() / 1000);
    const base = () => new SignJWT({ role: 'USER' }).setProtectedHeader({ alg: 'HS256' }).setSubject('u1');
    const noAudience = await base().setIssuedAt(now).setExpirationTime(now + 60).sign(key);
    await expect(tokens.verify(noAudience)).rejects.toMatchObject({ code: 'AUTH_UNAUTHENTICATED' });

    const godRole = await new SignJWT({ role: 'GOD' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('u1')
      .setAudience('yoyo:access')
      .setIssuedAt(now)
      .setExpirationTime(now + 60)
      .sign(key);
    await expect(tokens.verify(godRole)).rejects.toMatchObject({ code: 'AUTH_UNAUTHENTICATED' });
  });
});

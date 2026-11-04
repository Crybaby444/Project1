import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';

/** argon2id with the library defaults (19 MiB memory, 2 passes, 1 lane: the OWASP baseline). */
@Injectable()
export class PasswordService {
  /** Hash of a random password, checked when there is no real hash so the answer takes the same time. */
  private dummyHash: Promise<string> | undefined;

  hash(plain: string): Promise<string> {
    return hash(plain);
  }

  /**
   * True only when `plain` matches `storedHash`. With no stored hash (unknown email, Google-only
   * account) a dummy hash is checked anyway, so response time does not reveal whether the account exists.
   */
  async verify(storedHash: string | null, plain: string): Promise<boolean> {
    if (storedHash === null) {
      this.dummyHash ??= hash(randomBytes(32).toString('base64url'));
      await this.check(await this.dummyHash, plain);
      return false;
    }
    return this.check(storedHash, plain);
  }

  private async check(storedHash: string, plain: string): Promise<boolean> {
    try {
      return await verify(storedHash, plain);
    } catch {
      return false;
    }
  }
}

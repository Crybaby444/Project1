import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';

export const IDEMPOTENT_KEY = 'yoyo:idempotent';

export interface IdempotentOptions {
  /** The request moves money: without an Idempotency-Key header it is refused (400 IDEMPOTENCY_KEY_REQUIRED). */
  required: boolean;
}

/**
 * Makes a POST safe to repeat: the same Idempotency-Key with the same body gets the first answer again
 * instead of running twice (IdempotencyInterceptor). Use behind a guard that signs the user in.
 */
export const Idempotent = (options: IdempotentOptions) =>
  applyDecorators(
    SetMetadata(IDEMPOTENT_KEY, options),
    ApiHeader({
      name: 'Idempotency-Key',
      required: options.required,
      description:
        'A new random key (8–100 of A–Z a–z 0–9 - _) per user action; resend the same one when retrying. ' +
        'A repeat gets the first answer with `Idempotent-Replayed: true`.',
    }),
  );

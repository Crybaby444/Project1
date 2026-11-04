import type { PublicUser } from '@yoyo/shared';
import type { User } from '../generated/prisma/client';

/** The only way a user leaves the API: an explicit allow-list of fields, no hashes, no internals. */
export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    city: user.city,
    about: user.about,
    locale: user.locale as PublicUser['locale'],
    theme: user.theme as PublicUser['theme'],
    role: user.role,
    emailVerified: user.emailVerifiedAt !== null,
    hasPassword: user.passwordHash !== null,
    phone: user.phone,
    phoneVerified: user.phoneVerifiedAt !== null,
    createdAt: user.createdAt.toISOString(),
  };
}

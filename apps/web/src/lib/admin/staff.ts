import type { PublicUser, StaffRole } from '@yoyo/shared';

/** The signed-in person's part of the admin panel; an administrator without a staff role is the owner (as in the API). */
export function panelRole(user: Pick<PublicUser, 'role' | 'staffRole'> | null | undefined): StaffRole | null {
  return user?.role === 'ADMIN' ? (user.staffRole ?? 'OWNER') : null;
}

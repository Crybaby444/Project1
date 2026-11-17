/**
 * How a person appears to others (owner, 2026-11-16: "use the username everywhere"): `@username`, or only
 * the first name for an account that has not chosen one yet. The full name stays for the contract, the
 * admin panel and the identity check.
 */
export function publicName(user: { name: string; username: string | null; deletedAt?: Date | null }): string {
  if (user.deletedAt) return 'Deleted user';
  if (user.username) return `@${user.username}`;
  return user.name.trim().split(/\s+/)[0] ?? user.name;
}

/** A tab of your own profile, where your items, shops, favourites and follows live (2026-11-19). */
export function myProfileHref(userId: string, tab: 'items' | 'shops' | 'favorites' | 'following' | string = 'items', status?: string): string {
  const query = new URLSearchParams({ tab });
  if (status) query.set('status', status);
  return `/u/${userId}?${query.toString()}`;
}

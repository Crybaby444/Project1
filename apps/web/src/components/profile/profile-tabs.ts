/** The profile's tabs, shared by the page (reads `?tab=`) and the tabs themselves. */
export const PROFILE_TABS = ['items', 'favorites', 'following', 'shops', 'reviews'] as const;
export type ProfileTab = (typeof PROFILE_TABS)[number];

export const isProfileTab = (value: string | undefined): value is ProfileTab =>
  (PROFILE_TABS as readonly string[]).includes(value ?? '');

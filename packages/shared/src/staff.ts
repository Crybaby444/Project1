import { z } from 'zod';

/** Who does what in the admin panel (owner's checklist 2026-11-15: each sees only their part). */
export const STAFF_ROLES = ['OWNER', 'MODERATOR', 'SUPPORT', 'FINANCE', 'EDITOR'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const ADMIN_SECTIONS = [
  'overview',
  'traffic',
  'seo',
  'content',
  'moderation',
  'identity',
  'deals',
  'reports',
  'categories',
  'users',
  'money',
  'audit',
  'settings',
  'system',
  'staff',
  /** Your own two-step sign-in: everyone in the panel. */
  'security',
] as const;
export type AdminSection = (typeof ADMIN_SECTIONS)[number];

/** The sections each staff role may open; the API checks the same table. */
export const STAFF_PERMISSIONS: Record<StaffRole, readonly AdminSection[]> = {
  OWNER: ADMIN_SECTIONS,
  MODERATOR: ['overview', 'security', 'moderation', 'identity', 'reports', 'categories', 'users'],
  SUPPORT: ['overview', 'security', 'identity', 'users', 'deals', 'reports'],
  FINANCE: ['overview', 'security', 'deals', 'money', 'system'],
  EDITOR: ['overview', 'security', 'traffic', 'seo', 'content', 'categories'],
};

export function staffMay(staffRole: StaffRole | null | undefined, section: AdminSection): boolean {
  return staffRole != null && STAFF_PERMISSIONS[staffRole].includes(section);
}

export const StaffMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  staffRole: z.enum(STAFF_ROLES),
  twoFactor: z.boolean(),
  lastSeenAt: z.iso.datetime().nullable(),
});
export type StaffMember = z.infer<typeof StaffMemberSchema>;
export const StaffListSchema = z.object({ items: z.array(StaffMemberSchema) });
/** Make someone staff with a role, or (null) take them out of the admin panel. */
export const StaffChangeSchema = z.object({ staffRole: z.enum(STAFF_ROLES).nullable() });
export type StaffList = z.infer<typeof StaffListSchema>;

import { z } from 'zod';

/**
 * Identity checked by a person (owner, 2026-11-16: no free check service without a company, so a moderator
 * looks). Needed to sign a deal's contract. GDPR: given with consent, the photos are encrypted, seen only by
 * moderators (every look logged) and deleted as soon as a decision is made; only the result is kept.
 */
export const IDENTITY_DOCUMENTS = ['PASSPORT', 'ID_CARD', 'DRIVING_LICENCE'] as const;
export type IdentityDocument = (typeof IDENTITY_DOCUMENTS)[number];

export const IDENTITY_STATUSES = ['NONE', 'PENDING', 'VERIFIED', 'REJECTED'] as const;
export type IdentityStatus = (typeof IDENTITY_STATUSES)[number];

/** What the person sends besides the two photos (multipart fields). */
export const IdentitySubmitSchema = z.object({
  documentType: z.enum(IDENTITY_DOCUMENTS),
  /** The explicit consent to this processing (GDPR art. 6(1)(a), 9 does not apply: no biometrics are computed). */
  consent: z.literal('true'),
});

export const IdentityStateSchema = z.object({
  status: z.enum(IDENTITY_STATUSES),
  documentType: z.enum(IDENTITY_DOCUMENTS).nullable(),
  /** Why a check was refused, for the person to fix. */
  refusal: z.string().max(500).nullable(),
  submittedAt: z.iso.datetime().nullable(),
  decidedAt: z.iso.datetime().nullable(),
});
export type IdentityState = z.infer<typeof IdentityStateSchema>;

export const AdminIdentityItemSchema = z.object({
  id: z.string(),
  user: z.object({ id: z.string(), name: z.string(), email: z.string(), birthDate: z.string().nullable() }),
  documentType: z.enum(IDENTITY_DOCUMENTS),
  submittedAt: z.iso.datetime(),
});
export const AdminIdentityQueueSchema = z.object({ items: z.array(AdminIdentityItemSchema) });
export type AdminIdentityQueue = z.infer<typeof AdminIdentityQueueSchema>;

export const IdentityDecisionSchema = z
  .object({ decision: z.enum(['approve', 'reject']), reason: z.string().trim().max(500).optional() })
  .superRefine((body, ctx) => {
    if (body.decision === 'reject' && !body.reason) ctx.addIssue({ code: 'custom', path: ['reason'], message: 'Say why, so the person can fix it' });
  });
export type IdentityDecision = z.infer<typeof IdentityDecisionSchema>;

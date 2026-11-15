import { z } from 'zod';

export const REPORT_TARGETS = ['LISTING', 'USER', 'MESSAGE'] as const;
export type ReportTarget = (typeof REPORT_TARGETS)[number];
export const REPORT_REASONS = ['SCAM', 'PROHIBITED', 'MISLEADING', 'OFFENSIVE', 'OTHER'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
export const REPORT_STATUSES = ['OPEN', 'RESOLVED', 'DISMISSED'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

/** A complaint (spec §5): about an item, a person or a chat message; "Other" needs a few words. */
export const ReportRequestSchema = z
  .object({
    target: z.enum(REPORT_TARGETS),
    id: z.string().min(1).max(64),
    reason: z.enum(REPORT_REASONS),
    note: z.string().trim().max(1000).default(''),
  })
  .refine((v) => v.reason !== 'OTHER' || v.note.length >= 5, { path: ['note'], message: 'Say what is wrong' });
export type ReportRequest = z.infer<typeof ReportRequestSchema>;

/** A complaint as the admin queue shows it, with what it is about in words. */
export const AdminReportSchema = z.object({
  id: z.string(),
  target: z.enum(REPORT_TARGETS),
  reason: z.enum(REPORT_REASONS),
  note: z.string(),
  status: z.enum(REPORT_STATUSES),
  createdAt: z.iso.datetime(),
  reporter: z.object({ id: z.string(), name: z.string() }),
  /** What it is about: the item's title, the person's name or the message text. */
  subject: z.object({ id: z.string(), label: z.string(), userId: z.string().min(1).nullable() }),
  resolution: z.string().min(1).nullable(),
  resolvedAt: z.iso.datetime().nullable(),
});
export type AdminReport = z.infer<typeof AdminReportSchema>;

export const AdminReportsQuerySchema = z.object({
  status: z.enum(REPORT_STATUSES).default('OPEN'),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
});
export const ADMIN_REPORTS_PAGE_SIZE = 30;
export const AdminReportListSchema = z.object({ items: z.array(AdminReportSchema), total: z.number().int() });
export type AdminReportList = z.infer<typeof AdminReportListSchema>;

/** The administrator's verdict: acted on it (RESOLVED) or nothing to do (DISMISSED), with a note. */
export const CloseReportSchema = z.object({ status: z.enum(['RESOLVED', 'DISMISSED']), resolution: z.string().trim().min(1).max(1000) });
export type CloseReport = z.infer<typeof CloseReportSchema>;

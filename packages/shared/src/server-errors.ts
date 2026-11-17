import { z } from 'zod';

/** An unexpected server error as the admin sees it (System → Errors); the same one within a minute is counted. */
export const ServerErrorSchema = z.object({
  id: z.string(),
  message: z.string().max(400),
  stack: z.string().max(4000),
  method: z.string().max(10),
  path: z.string().max(300),
  count: z.number().int(),
  firstAt: z.iso.datetime(),
  lastAt: z.iso.datetime(),
});
export const ServerErrorListSchema = z.object({ items: z.array(ServerErrorSchema) });
export type ServerErrorList = z.infer<typeof ServerErrorListSchema>;

import { Inject, Injectable, Logger } from '@nestjs/common';
import { ACTIVITY_GROUPS, type ActivityEvent, type ActivityKind, type ActivityPage, type ActivityQuery } from '@yoyo/shared';
import { CLOCK, type Clock } from '../clock/clock';
import { PrismaService } from '../prisma/prisma.service';

type Target = { type: NonNullable<ActivityEvent['targetType']>; id: string };

/** Older events are pruned by the timers job (GDPR: no longer than needed). */
export const ACTIVITY_KEEP_DAYS = 180;

/**
 * The record of what people do, for the admin (owner, 2026-11-16). Writing never fails or slows the
 * action it records: it is not awaited, and an error is only logged.
 */
@Injectable()
export class ActivityService {
  private readonly logger = new Logger('Activity');

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  record(kind: ActivityKind, actorId: string | null, target: Target | null, summary = ''): void {
    void this.prisma.activityEvent
      .create({ data: { kind, actorId, targetType: target?.type ?? null, targetId: target?.id ?? null, summary: summary.slice(0, 200), createdAt: this.clock.now() } })
      .catch((error: unknown) => this.logger.error(`Could not record ${kind}: ${error instanceof Error ? error.message : String(error)}`));
  }

  /** Newest first; `next` is the cursor for the page after (created time and id). */
  async list(query: ActivityQuery): Promise<ActivityPage> {
    const kinds = query.kind ? [query.kind] : query.group ? [...ACTIVITY_GROUPS[query.group]] : undefined;
    let cursor: { at: Date; id: string } | null = null;
    if (query.before) {
      const [at, id] = query.before.split('_');
      if (at && id && !Number.isNaN(Number(at))) cursor = { at: new Date(Number(at)), id };
    }
    const rows = await this.prisma.activityEvent.findMany({
      where: {
        ...(kinds && { kind: { in: kinds } }),
        ...(query.userId && { actorId: query.userId }),
        ...(cursor && { OR: [{ createdAt: { lt: cursor.at } }, { createdAt: cursor.at, id: { lt: cursor.id } }] }),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const page = rows.slice(0, query.limit);
    const actorIds = [...new Set(page.map((r) => r.actorId).filter((id): id is string => id !== null))];
    const actors = new Map(
      (await this.prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true, username: true, deletedAt: true } })).map((u) => [u.id, u]),
    );
    const last = page.at(-1);
    return {
      items: page.map((r) => {
        const actor = r.actorId ? actors.get(r.actorId) : undefined;
        return {
          id: r.id,
          kind: r.kind as ActivityKind,
          // The admin sees full names (owner, 2026-11-16: full names stay in the admin).
          actor: actor ? { id: actor.id, name: actor.deletedAt ? 'Deleted user' : actor.name, username: actor.username } : null,
          targetType: (r.targetType as ActivityEvent['targetType']) ?? null,
          targetId: r.targetId,
          summary: r.summary,
          at: r.createdAt.toISOString(),
        };
      }),
      next: rows.length > query.limit && last ? `${last.createdAt.getTime()}_${last.id}` : null,
    };
  }

  async prune(): Promise<number> {
    const before = new Date(this.clock.now().getTime() - ACTIVITY_KEEP_DAYS * 86_400_000);
    return (await this.prisma.activityEvent.deleteMany({ where: { createdAt: { lt: before } } })).count;
  }
}


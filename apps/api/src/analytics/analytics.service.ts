import { Inject, Injectable, Logger } from '@nestjs/common';
import type { AdminAnalytics, AdminSeo, AnalyticsHit } from '@yoyo/shared';
import { CLOCK, type Clock } from '../clock/clock';
import type { AnalyticsMetric } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|pingdom|monitor|curl|wget|python|axios|node-fetch/i;
const TOP = 10;
const DAY = 86_400_000;

const dayOf = (d: Date) => new Date(`${d.toISOString().slice(0, 10)}T00:00:00.000Z`);
/** Lowercase, no diacritics: "Drons", "drons" and "DRONS" are one search. */
const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

/** The page's kind of path: ids folded away, so "/listings/:id" counts all item pages together. */
export function normalizePath(path: string): string {
  const bare = (path.split(/[?#]/)[0] ?? '/').replace(/^\/(en|lv|ru)(?=\/|$)/, '') || '/';
  if (/^\/listings\/(?!new$)[^/]+$/.test(bare)) return '/listings/:id';
  if (/^\/listings\/[^/]+\/edit$/.test(bare)) return '/listings/:id/edit';
  if (/^\/(bookings|messages|u|admin\/deals)\/[^/]+$/.test(bare)) return bare.replace(/\/[^/]+$/, '/:id');
  if (/^\/items\/[^/]+\/book$/.test(bare)) return '/items/:id/book';
  return bare.slice(0, 120);
}

export function deviceOf(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
  if (/iPad|Tablet/i.test(userAgent)) return 'tablet';
  if (/Mobi|iPhone|Android/i.test(userAgent)) return 'mobile';
  return 'desktop';
}

function sourceOf(referrer: string): string {
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '');
    return host || '(direct)';
  } catch {
    return '(direct)';
  }
}

/**
 * First-party, cookieless statistics (owner, 2026-11-15): daily counters only, never a person, an address
 * or a device id, so no consent is needed. Bots are left out. Plus an SEO check of the published items.
 */
@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger('Analytics');

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async count(metric: AnalyticsMetric, key: string, by = 1): Promise<void> {
    try {
      const day = dayOf(this.clock.now());
      await this.prisma.$executeRaw`
        INSERT INTO "AnalyticsCounter" ("day", "metric", "key", "value") VALUES (${day}, ${metric}::"AnalyticsMetric", ${key}, ${by})
        ON CONFLICT ("day", "metric", "key") DO UPDATE SET "value" = "AnalyticsCounter"."value" + ${by}`;
    } catch (error) {
      this.logger.error(`count ${metric}/${key} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async hit(hit: AnalyticsHit, userAgent: string): Promise<void> {
    if (!userAgent || BOT.test(userAgent)) return;
    const path = normalizePath(hit.path);
    const jobs = [this.count('VIEW', path), this.count('DEVICE', deviceOf(userAgent)), this.count('LOCALE', hit.locale || '?')];
    if (hit.entry) jobs.push(this.count('ENTRY', sourceOf(hit.referrer)));
    if (path === '/listings/:id') jobs.push(this.count('FUNNEL', 'ITEM_VIEW'));
    if (hit.search) {
      const q = fold(hit.search.q).slice(0, 60);
      jobs.push(this.count('SEARCH', q));
      if (hit.search.results === 0) jobs.push(this.count('SEARCH_EMPTY', q));
    }
    await Promise.all(jobs);
  }

  async report(days: number): Promise<AdminAnalytics> {
    const to = dayOf(this.clock.now());
    const from = new Date(to.getTime() - (days - 1) * DAY);
    const rows = await this.prisma.analyticsCounter.findMany({ where: { day: { gte: from, lte: to } } });
    const sum = (metric: AnalyticsMetric) => rows.filter((r) => r.metric === metric).reduce((a, r) => a + r.value, 0);
    const top = (metric: AnalyticsMetric) => {
      const by = new Map<string, number>();
      for (const r of rows) if (r.metric === metric) by.set(r.key, (by.get(r.key) ?? 0) + r.value);
      return [...by].map(([key, value]) => ({ key, value })).sort((a, b) => b.value - a.value || a.key.localeCompare(b.key)).slice(0, TOP);
    };
    const funnel = (key: string) => rows.filter((r) => r.metric === 'FUNNEL' && r.key === key).reduce((a, r) => a + r.value, 0);
    const series = Array.from({ length: days }, (_, i) => {
      const day = new Date(from.getTime() + i * DAY).toISOString().slice(0, 10);
      const on = rows.filter((r) => r.day.toISOString().slice(0, 10) === day);
      return {
        day,
        views: on.filter((r) => r.metric === 'VIEW').reduce((a, r) => a + r.value, 0),
        visits: on.filter((r) => r.metric === 'ENTRY').reduce((a, r) => a + r.value, 0),
      };
    });
    return {
      days,
      totals: { views: sum('VIEW'), visits: sum('ENTRY') },
      series,
      pages: top('VIEW'),
      sources: top('ENTRY'),
      devices: top('DEVICE'),
      locales: top('LOCALE'),
      searches: top('SEARCH'),
      emptySearches: top('SEARCH_EMPTY'),
      funnel: { itemViews: funnel('ITEM_VIEW'), requests: funnel('REQUEST'), signups: funnel('SIGNUP') },
    };
  }

  /** What holds each published item back in search engines and on its page, worst first. */
  async seo(): Promise<AdminSeo> {
    const listings = await this.prisma.listing.findMany({
      where: { status: 'PUBLISHED' },
      select: { id: true, title: true, description: true, district: true, _count: { select: { photos: true } } },
    });
    type Issue = AdminSeo['issues'][number]['key'];
    const scored = listings.map((l) => {
      const title = l.title ?? '';
      const issues: Issue[] = [];
      if (title.length < 15) issues.push('SHORT_TITLE');
      if (title.length > 70) issues.push('LONG_TITLE');
      if ((l.description ?? '').length < 120) issues.push('SHORT_DESCRIPTION');
      if (l._count.photos < 3) issues.push('FEW_PHOTOS');
      if (!l.district?.trim()) issues.push('NO_DISTRICT');
      return { id: l.id, title, score: 100 - issues.length * 20, issues };
    });
    const counts = new Map<Issue, number>();
    for (const l of scored) for (const i of l.issues) counts.set(i, (counts.get(i) ?? 0) + 1);
    return {
      published: scored.length,
      healthy: scored.filter((l) => l.issues.length === 0).length,
      issues: [...counts].map(([key, value]) => ({ key, value })).sort((a, b) => b.value - a.value),
      listings: scored.sort((a, b) => a.score - b.score || a.title.localeCompare(b.title)).slice(0, 50),
    };
  }
}

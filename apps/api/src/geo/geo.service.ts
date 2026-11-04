import { Inject, Injectable } from '@nestjs/common';
import { GEO_ATTRIBUTION, type GeoReverseResponse, type GeoSearchResponse, type Locale } from '@yoyo/shared';
import { CLOCK, type Clock } from '../clock/clock';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NominatimClient } from './nominatim.client';

const CACHE_MS = 30 * 24 * 60 * 60_000;

/** One cache entry for the same words in any letter case and spacing. */
export function normalizeQuery(query: string): string {
  return query.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

@Injectable()
export class GeoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly nominatim: NominatimClient,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async search(query: string, lang: Locale): Promise<GeoSearchResponse> {
    const results = await this.cached(`search:${lang}:${normalizeQuery(query)}`, () => this.nominatim.search(query.trim(), lang));
    return { results, attribution: GEO_ATTRIBUTION };
  }

  /** Points are rounded to 5 decimals (about a metre): a closer neighbour shares the answer. */
  async reverse(lat: number, lng: number, lang: Locale): Promise<GeoReverseResponse> {
    const [la, ln] = [Number(lat.toFixed(5)), Number(lng.toFixed(5))];
    const place = await this.cached(`reverse:${lang}:${la},${ln}`, () => this.nominatim.reverse(la, ln, lang));
    return { ...place, attribution: GEO_ATTRIBUTION };
  }

  /** The answer stored under `key` if younger than 30 days; otherwise a fresh one, stored. Failures are not stored. */
  private async cached<T>(key: string, fetchFresh: () => Promise<T>): Promise<T> {
    const now = this.clock.now();
    const cutoff = new Date(now.getTime() - CACHE_MS);
    const hit = await this.prisma.geoCache.findUnique({ where: { key } });
    if (hit && hit.createdAt > cutoff) return hit.payload as T;
    const fresh = await fetchFresh();
    const payload = fresh as Prisma.InputJsonValue;
    await this.prisma.geoCache.upsert({ where: { key }, create: { key, payload, createdAt: now }, update: { payload, createdAt: now } });
    await this.prisma.geoCache.deleteMany({ where: { createdAt: { lte: cutoff } } });
    return fresh;
  }
}

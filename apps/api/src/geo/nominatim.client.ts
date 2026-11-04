import { Logger } from '@nestjs/common';
import type { GeoPlace, Locale } from '@yoyo/shared';
import type { Clock } from '../clock/clock';
import { AppError } from '../common/app-error';

/** How the client waits for its turn; tests replace it so the fake clock moves instead. */
export type Sleep = (ms: number) => Promise<void>;

/** Injection token for the Sleep the geocoder uses. */
export const GEO_SLEEP = Symbol('GEO_SLEEP');

export const realSleep: Sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Nominatim's usage policy: at most one request a second from the whole application. */
const INTERVAL_MS = 1000;
/** A request waits at most this long for its turn, then gives up with 503. */
const MAX_WAIT_MS = 5000;
const TIMEOUT_MS = 5000;
/** Identifies the application, as the policy requires. */
export const USER_AGENT = 'Yoyo/1.0 (+https://yoyo.rent)';

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  municipality?: string;
  suburb?: string;
  city_district?: string;
  quarter?: string;
  neighbourhood?: string;
  borough?: string;
}

interface NominatimPlace {
  lat?: string;
  lon?: string;
  display_name?: string;
  address?: NominatimAddress;
  error?: string;
}

const round6 = (value: number) => Math.round(value * 1e6) / 1e6;

function cityOf(address: NominatimAddress = {}): string | null {
  return address.city ?? address.town ?? address.village ?? address.hamlet ?? address.municipality ?? null;
}

function districtOf(address: NominatimAddress = {}): string | null {
  return address.suburb ?? address.city_district ?? address.quarter ?? address.neighbourhood ?? address.borough ?? null;
}

const unavailable = () => new AppError('GEO_UNAVAILABLE', 503);

/**
 * Talks to Nominatim (OpenStreetMap) within its usage policy: one request a second for the whole
 * server, queued in arrival order. A request that would wait more than 5 s for its turn, and any
 * failure or timeout of Nominatim, is 503 GEO_UNAVAILABLE. Time comes from the Clock.
 */
export class NominatimClient {
  private readonly logger = new Logger('Geo');
  private readonly baseUrl: string;
  /** The earliest moment (ms) the next request may go out. */
  private nextSlot = 0;

  constructor(
    baseUrl: string,
    private readonly clock: Clock,
    private readonly sleep: Sleep = realSleep,
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async search(query: string, lang: Locale): Promise<GeoPlace[]> {
    const found = await this.get<NominatimPlace[]>('/search', { q: query, format: 'jsonv2', addressdetails: '1', limit: '5', 'accept-language': lang });
    if (!Array.isArray(found)) throw unavailable();
    return found
      .filter((place) => place.lat !== undefined && place.lon !== undefined)
      .slice(0, 5)
      .map((place) => ({
        label: place.display_name ?? '',
        city: cityOf(place.address),
        district: districtOf(place.address),
        lat: round6(Number(place.lat)),
        lng: round6(Number(place.lon)),
      }));
  }

  async reverse(lat: number, lng: number, lang: Locale): Promise<{ city: string | null; district: string | null }> {
    const place = await this.get<NominatimPlace>('/reverse', {
      lat: String(lat),
      lon: String(lng),
      format: 'jsonv2',
      addressdetails: '1',
      zoom: '16',
      'accept-language': lang,
    });
    return { city: cityOf(place.address), district: districtOf(place.address) };
  }

  private async get<T>(path: string, params: Record<string, string>): Promise<T> {
    await this.waitForTurn();
    const url = `${this.baseUrl}${path}?${new URLSearchParams(params).toString()}`;
    let res: Response;
    try {
      res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (error) {
      this.logger.warn(`Nominatim ${path} failed: ${error instanceof Error ? error.message : String(error)}`);
      throw unavailable();
    }
    if (!res.ok) {
      this.logger.warn(`Nominatim ${path} answered ${res.status}`);
      throw unavailable();
    }
    try {
      return (await res.json()) as T;
    } catch {
      throw unavailable();
    }
  }

  /** Takes the next free one-second slot, or refuses at once if it is more than 5 s away. */
  private async waitForTurn(): Promise<void> {
    const now = this.clock.now().getTime();
    const slot = Math.max(now, this.nextSlot);
    if (slot - now > MAX_WAIT_MS) throw unavailable();
    this.nextSlot = slot + INTERVAL_MS;
    if (slot > now) await this.sleep(slot - now);
  }
}

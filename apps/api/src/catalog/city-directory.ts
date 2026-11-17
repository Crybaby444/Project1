import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { Injectable } from '@nestjs/common';
import { slugify, type Country } from '@yoyo/shared';

/** GeoNames cities1000 (CC BY 4.0): `[name, other names, population, lat, lng]`, most people first. */
type Row = [string, string[], number, number, number];
type City = { name: string; slug: string; keys: string[]; slugs: Set<string>; population: number };

/** `assets/` sits next to `src/` and `dist/`, so the same path works in tests and in the image. */
const FILE = join(__dirname, '..', '..', 'assets', 'places', 'cities.json.gz');
const LIMIT = 8;

/** Lowercase, no accents: "Rīga" and "riga", "München" and "munchen" are the same key. */
const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

/**
 * Every place of 1000 people or more in the euro area (owner, 2026-11-16: type any city of the country,
 * search by city). Loaded once, kept in memory; local names (Рига, Riia) find the city too.
 */
@Injectable()
export class CityDirectory {
  private cities: Promise<Map<string, City[]>> | undefined;

  private load(): Promise<Map<string, City[]>> {
    this.cities ??= readFile(FILE).then((gz) => {
      const data = JSON.parse(gunzipSync(gz).toString('utf8')) as { countries: Record<string, Row[]> };
      const byCountry = new Map<string, City[]>();
      for (const [country, rows] of Object.entries(data.countries)) {
        byCountry.set(
          country,
          rows.map(([name, others, population]) => {
            // The file already holds the local spelling first (Rīga, not GeoNames' Riga; scripts/cities).
            const all = [name, ...others];
            return { name, slug: slugify(name), keys: [...new Set(all.map(fold))], slugs: new Set(all.map(slugify)), population };
          }),
        );
      }
      return byCountry;
    });
    return this.cities;
  }

  /**
   * Every slug a city goes by (Rīga, Riga, Рига; München, Munich), so a search by one finds items whose
   * city was written another way; just `slug` for a place the list does not know.
   */
  async aliases(slug: string, country?: string): Promise<Set<string>> {
    const all = await this.load();
    for (const [code, cities] of all) {
      if (country && code !== country) continue;
      const city = cities.find((c) => c.slugs.has(slug));
      if (city) return city.slugs;
    }
    return new Set([slug]);
  }

  /** Cities whose name (or a word of it) starts with `q`; places that start with it come first, then the bigger. */
  async suggest(country: Country, q: string): Promise<{ name: string; slug: string }[]> {
    const wanted = fold(q);
    const cities = (await this.load()).get(country) ?? [];
    const scored: { city: City; rank: number }[] = [];
    for (const city of cities) {
      let rank = 0;
      for (const key of city.keys) {
        if (key === wanted) rank = Math.max(rank, 3);
        else if (key.startsWith(wanted)) rank = Math.max(rank, 2);
        else if (key.split(/[\s-]+/).some((word) => word.startsWith(wanted))) rank = Math.max(rank, 1);
      }
      if (rank > 0) scored.push({ city, rank });
    }
    const seen = new Set<string>();
    return scored
      .sort((a, b) => b.rank - a.rank || b.city.population - a.city.population)
      .filter(({ city }) => (seen.has(city.slug) ? false : (seen.add(city.slug), true)))
      .slice(0, LIMIT)
      .map(({ city }) => ({ name: city.name, slug: city.slug }));
  }
}

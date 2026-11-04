import { z } from 'zod';
import { LOCALES } from './locale';

/** Shown next to every map and address search result (OpenStreetMap's licence asks for it). */
export const GEO_ATTRIBUTION = '© OpenStreetMap contributors';

export const GeoSearchQuerySchema = z.object({
  q: z.string().trim().min(2).max(200),
  /** Language of the place names. */
  lang: z.enum(LOCALES).default('en'),
});

export const GeoReverseQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  lang: z.enum(LOCALES).default('en'),
});

export const GeoPlaceSchema = z.object({
  /** The full address as the geocoder writes it. */
  label: z.string(),
  city: z.string().nullable(),
  district: z.string().nullable(),
  lat: z.number(),
  lng: z.number(),
});

export type GeoPlace = z.infer<typeof GeoPlaceSchema>;

export const GeoSearchResponseSchema = z.object({ results: z.array(GeoPlaceSchema), attribution: z.string() });

export type GeoSearchResponse = z.infer<typeof GeoSearchResponseSchema>;

export const GeoReverseResponseSchema = z.object({
  city: z.string().nullable(),
  district: z.string().nullable(),
  attribution: z.string(),
});

export type GeoReverseResponse = z.infer<typeof GeoReverseResponseSchema>;

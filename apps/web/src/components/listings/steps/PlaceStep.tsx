'use client';

import { GeoReverseResponseSchema, LISTING_LIMITS, type DatePeriod, type GeoPlace } from '@yoyo/shared';
import dynamic from 'next/dynamic';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Field } from '@/components/ui/Field';
import { INPUT_CLASS } from '@/components/ui/inputs';
import { useToast } from '@/components/ui/Toast';
import { useErrorText } from '@/lib/forms/error-text';
import { todayIn } from '@/lib/listings/calendar';
import { unwrap } from '@/lib/session/api-error';
import { useApiClient } from '@/lib/session/SessionProvider';
import { useBuilder } from '../BuilderContext';
import { AddressSearch } from './AddressSearch';
import { UnavailabilityCalendar } from './UnavailabilityCalendar';

// Leaflet touches `window`: load the map in the browser only, and only on this step.
const LocationMap = dynamic(() => import('./LocationMap').then((module) => module.LocationMap), {
  ssr: false,
  loading: () => (
    <div
      aria-hidden="true"
      className="border-ink/20 bg-mist rounded-card h-72 animate-pulse border sm:h-80"
    />
  ),
});

const SAVE_DATES_AFTER_MS = 700;

/** Step 5: the pick-up point (search or map), the public city and district, and unavailable days. */
export function PlaceStep() {
  const t = useTranslations('builder.place');
  const tCalendar = useTranslations('builder.calendar');
  const locale = useLocale();
  const client = useApiClient();
  const toast = useToast();
  const errorText = useErrorText();
  const { draft, errorFor, touch, readOnly } = useBuilder();
  const { values } = draft;
  const listing = draft.listing;
  const point = values.lat !== null && values.lng !== null ? { lat: values.lat, lng: values.lng } : null;
  /** Once the person types a city or district, a new point no longer overwrites it. */
  const placeTyped = useRef(false);
  const [announcement, setAnnouncement] = useState('');
  const [periods, setPeriods] = useState<DatePeriod[]>(listing?.unavailability ?? []);
  const datesTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const today = todayIn(listing?.timeZone ?? 'Europe/Riga');

  /** The date save still waiting, so leaving the step sends it at once instead of dropping it. */
  const pendingSave = useRef<(() => Promise<void>) | null>(null);
  useEffect(
    () => () => {
      clearTimeout(datesTimer.current);
      void pendingSave.current?.();
    },
    [],
  );

  function setPlace(place: GeoPlace) {
    placeTyped.current = false;
    draft.change({
      lat: place.lat,
      lng: place.lng,
      city: place.city ?? values.city,
      district: place.district ?? values.district,
    });
    setAnnouncement(
      t('pointSet', { place: [place.city, place.district].filter(Boolean).join(', ') || place.label }),
    );
  }

  async function pickOnMap(lat: number, lng: number) {
    draft.change({ lat, lng });
    try {
      // Parsed with the shared schema: the generated client types city and district wrongly (as arrays).
      const found = GeoReverseResponseSchema.parse(
        await unwrap(
          client.GET('/api/v1/geo/reverse', { params: { query: { lat, lng, lang: locale as 'en' } } }),
        ),
      );
      if (!placeTyped.current) {
        draft.change({
          ...(found.city ? { city: found.city } : {}),
          ...(found.district ? { district: found.district } : {}),
        });
      }
      const name = [found.city, found.district].filter(Boolean).join(', ');
      setAnnouncement(name ? t('pointSet', { place: name }) : t('pointSetNoName'));
    } catch {
      // Without a name the point is still set; the city and district can be typed.
      setAnnouncement(t('pointSetNoName'));
    }
  }

  function changeDates(next: DatePeriod[]) {
    setPeriods(next);
    clearTimeout(datesTimer.current);
    const save = async () => {
      pendingSave.current = null;
      try {
        await draft.withListing(async (current) => {
          const saved = await unwrap(
            client.PUT('/api/v1/listings/{id}/unavailability', {
              params: { path: { id: current.id } },
              body: { periods: next, version: current.version },
            }),
          );
          setPeriods(saved.periods);
          return (latest) => ({ ...latest, unavailability: saved.periods, version: saved.version });
        });
      } catch (error) {
        setPeriods(draft.listing?.unavailability ?? []);
        toast.show(errorText(error));
      }
    };
    pendingSave.current = save;
    datesTimer.current = setTimeout(() => void save(), SAVE_DATES_AFTER_MS);
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-5">
        <AddressSearch onSelect={setPlace} disabled={readOnly} />
        <LocationMap point={point} onPick={(lat, lng) => void pickOnMap(lat, lng)} readOnly={readOnly} />
        <p className="bg-sticker-lavender rounded-card flex items-start gap-2 border border-black p-4 text-sm font-bold text-black">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="mt-0.5 size-4 shrink-0">
            <rect
              x="5"
              y="10"
              width="14"
              height="10"
              rx="2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
            />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="1.75" />
          </svg>
          {t('privacy')}
        </p>
        {errorFor('lat') && <p className="text-sm font-bold">{errorFor('lat')}</p>}
        <p role="status" aria-live="polite" className="sr-only">
          {announcement}
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t('city')} hint={t('placeHint')} error={errorFor('city')}>
            <input
              type="text"
              autoComplete="address-level2"
              value={values.city}
              maxLength={LISTING_LIMITS.place}
              readOnly={readOnly}
              onChange={(event) => {
                placeTyped.current = true;
                draft.change({ city: event.target.value });
              }}
              onBlur={() => touch('city')}
              className={INPUT_CLASS}
            />
          </Field>
          <Field label={t('district')} error={errorFor('district')}>
            <input
              type="text"
              autoComplete="address-level3"
              value={values.district}
              maxLength={LISTING_LIMITS.place}
              readOnly={readOnly}
              onChange={(event) => {
                placeTyped.current = true;
                draft.change({ district: event.target.value });
              }}
              onBlur={() => touch('district')}
              className={INPUT_CLASS}
            />
          </Field>
        </div>
      </section>

      <section aria-labelledby="calendar-title" className="border-ink/20 flex flex-col gap-3 border-t pt-6">
        <h3 id="calendar-title" className="text-xl font-bold">
          {tCalendar('title')}
        </h3>
        <p className="text-sm">{tCalendar('hint')}</p>
        <UnavailabilityCalendar periods={periods} today={today} onChange={changeDates} readOnly={readOnly} />
      </section>
    </div>
  );
}

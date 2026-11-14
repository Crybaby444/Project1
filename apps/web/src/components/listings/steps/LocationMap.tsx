'use client';

import type { Map as LeafletMap, Marker } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';

/** Free OpenStreetMap raster tiles, no key; another provider is a build-time setting. */
const TILES = process.env.NEXT_PUBLIC_MAP_TILES_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
/** Where the map opens before a point is set: Riga. */
const START = { lat: 56.9496, lng: 24.1052 };

const PIN = `<svg viewBox="0 0 36 44" width="36" height="44" aria-hidden="true">
  <path d="M18 43s15-14.2 15-25.5A15 15 0 0 0 3 17.5C3 28.8 18 43 18 43z" fill="var(--ink)" stroke="var(--canvas)" stroke-width="2"/>
  <circle cx="18" cy="17.5" r="7" fill="var(--canvas)"/>
  <path d="M11 17.5h14" stroke="var(--ink)" stroke-width="2"/>
</svg>`;

type Props = {
  point: { lat: number; lng: number } | null;
  onPick(lat: number, lng: number): void;
  readOnly: boolean;
};

/**
 * The listing's exact point on a Leaflet map (loaded only on this step). Click the map or drag the
 * sticker pin; keyboard users pan the map with the arrow keys and use "Put the point in the middle",
 * or the address search above. Only the owner ever sees this map.
 */
export function LocationMap({ point, onPick, readOnly }: Props) {
  const t = useTranslations('builder.place');
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const leaflet = useRef<typeof import('leaflet') | null>(null);
  /** Set once Leaflet has loaded, so the pin is drawn for a point that was already there. */
  const [ready, setReady] = useState(false);
  const pick = useRef(onPick);
  useEffect(() => {
    pick.current = onPick;
  });

  useEffect(() => {
    let cancelled = false;
    void import('leaflet').then((L) => {
      if (cancelled || !element.current || map.current) return;
      leaflet.current = L;
      const created = L.map(element.current, {
        center: point ?? START,
        zoom: point ? 15 : 12,
        scrollWheelZoom: false,
      });
      L.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(created);
      created.attributionControl.setPrefix(false);
      if (!readOnly) created.on('click', (event) => pick.current(event.latlng.lat, event.latlng.lng));
      map.current = created;
      setReady(true);
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
    // The map is created once; the point is followed by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const L = leaflet.current;
    const current = map.current;
    if (!L || !current) return;
    if (!point) {
      marker.current?.remove();
      marker.current = null;
      return;
    }
    if (!marker.current) {
      marker.current = L.marker(point, {
        icon: L.divIcon({ html: PIN, className: 'yoyo-pin', iconSize: [36, 44], iconAnchor: [18, 43] }),
        draggable: !readOnly,
        keyboard: false,
        title: t('pin'),
      }).addTo(current);
      marker.current.on('dragend', () => {
        const at = marker.current!.getLatLng();
        pick.current(at.lat, at.lng);
      });
    } else marker.current.setLatLng(point);
    if (!current.getBounds().contains(point)) current.setView(point, Math.max(current.getZoom(), 15));
  }, [point, ready, readOnly, t]);

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={element}
        role="region"
        aria-label={t('map')}
        className="border-ink/15 rounded-media relative z-0 h-72 overflow-hidden border sm:h-80"
      />
      <p className="text-sm">{t('mapHelp')}</p>
      {!readOnly && (
        <Button
          variant="ghost"
          className="self-start"
          onClick={() => {
            const centre = map.current?.getCenter();
            if (centre) pick.current(centre.lat, centre.lng);
          }}
        >
          {t('center')}
        </Button>
      )}
    </div>
  );
}

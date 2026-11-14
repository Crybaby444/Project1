'use client';

import type { Locale, MapPin } from '@yoyo/shared';
import type { Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { formatEuros } from '@/lib/listings/money';
import { listingPath, localePath } from '@/lib/seo';

const TILES = process.env.NEXT_PUBLIC_MAP_TILES_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const RIGA = { lat: 56.9496, lng: 24.1052 };

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

/**
 * The results on a map (Leaflet, loaded only for this view). Each pin is the middle of a ~1 km cell,
 * never an item's point (the API does not send it); a cell with several items shows their number.
 * The list of the same results stays under the map, so the map is never the only way.
 */
export function CatalogMap({ pins, truncated }: { pins: MapPin[]; truncated: boolean }) {
  const t = useTranslations('catalog.map');
  const locale = useLocale() as Locale;
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import('leaflet').then((L) => {
      if (cancelled || !element.current) return;
      map.current?.remove();
      const created = L.map(element.current, { center: RIGA, zoom: 12, scrollWheelZoom: false });
      L.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: 18 }).addTo(created);
      created.attributionControl.setPrefix(false);
      for (const pin of pins) {
        const cheapest = Math.min(...pin.items.map((item) => item.dailyCents));
        const label = pin.count > 1 ? t('cell', { count: pin.count }) : formatEuros(cheapest, locale);
        const marker = L.marker(
          { lat: pin.lat, lng: pin.lng },
          {
            icon: L.divIcon({
              html: `<span class="yoyo-map-pin${pin.count > 1 ? ' yoyo-map-pin--many' : ''}">${escapeHtml(label)}</span>`,
              className: 'yoyo-map-pin-wrap',
              iconSize: undefined,
            }),
            keyboard: true,
            riseOnHover: true,
            title: pin.count > 1 ? t('cellTitle', { count: pin.count }) : (pin.items[0]?.title ?? label),
            alt: label,
          },
        ).addTo(created);
        const list = pin.items
          .map(
            (item) =>
              `<li><a href="${escapeHtml(localePath(locale, listingPath(item.id, item.title)))}">${escapeHtml(item.title)}</a><span class="yoyo-map-popup-price">${escapeHtml(
                t('perDay', { price: formatEuros(item.dailyCents, locale) }),
              )}</span></li>`,
          )
          .join('');
        const more = pin.count > pin.items.length ? `<p>${escapeHtml(t('more', { count: pin.count - pin.items.length }))}</p>` : '';
        marker.bindPopup(`<ul class="yoyo-map-popup">${list}</ul>${more}`, { closeButton: true });
      }
      if (pins.length > 0) created.fitBounds(L.latLngBounds(pins.map((pin) => [pin.lat, pin.lng] as [number, number])).pad(0.2), { maxZoom: 14 });
      map.current = created;
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, [pins, locale, t]);

  return (
    <div className="flex flex-col gap-2">
      <div ref={element} role="region" aria-label={t('label')} className="border-ink/15 rounded-media bg-mist relative z-0 h-[420px] overflow-hidden border lg:h-[560px]" />
      <p className="text-sm">{truncated ? t('truncated') : t('approximate')}</p>
    </div>
  );
}

'use client';

import type { MapPin } from '@yoyo/shared';
import dynamic from 'next/dynamic';

/** Leaflet only loads when the map view is open; until then a box of the same size holds the place. */
const CatalogMap = dynamic(() => import('./CatalogMap').then((m) => m.CatalogMap), {
  ssr: false,
  loading: () => <div aria-hidden="true" className="border-ink/15 rounded-media bg-mist h-[420px] border lg:h-[560px]" />,
});

export function CatalogMapLoader(props: { pins: MapPin[]; truncated: boolean }) {
  return <CatalogMap {...props} />;
}

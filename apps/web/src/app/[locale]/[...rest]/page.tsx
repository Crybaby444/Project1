import { notFound } from 'next/navigation';

// Any path that matches no page (e.g. /de, /LV, which resolve to the default locale)
// renders the localized app/[locale]/not-found.tsx with a 404 status.
export default function CatchAllPage() {
  notFound();
}

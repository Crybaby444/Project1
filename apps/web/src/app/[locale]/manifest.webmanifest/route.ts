import { LOCALES, type Locale } from '@yoyo/shared';
import { manifestFor } from '@/lib/pwa/manifest';

/** The web app manifest of a prefixed language (`/lv/…`, `/ru/…`). */
export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!(LOCALES as readonly string[]).includes(locale)) return new Response('Not found', { status: 404 });
  return Response.json(manifestFor(locale as Locale), {
    headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'public, max-age=3600' },
  });
}

import { manifestFor } from '@/lib/pwa/manifest';

/** The English web app manifest (the default language has no prefix). */
export function GET() {
  return Response.json(manifestFor('en'), {
    headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'public, max-age=3600' },
  });
}

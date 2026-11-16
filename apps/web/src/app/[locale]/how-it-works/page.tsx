import type { Locale } from '@yoyo/shared';
import { permanentRedirect } from 'next/navigation';
import { localizedPath } from '@/lib/seo';

type Params = { params: Promise<{ locale: string }> };

/** How it works lives on What is Yoyo now (owner, 2026-11-16: one page holds everything). */
export default async function HowItWorksPage({ params }: Params) {
  const { locale } = await params;
  permanentRedirect(localizedPath(locale as Locale, '/what-is-yoyo'));
}

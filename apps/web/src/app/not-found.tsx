import Link from 'next/link';
import en from '../../messages/en.json';
import { fontVariables } from '@/styles/fonts';
import './globals.css';
import { displayFit } from '@/lib/display-fit';

// For paths the locale proxy does not handle (e.g. a missing file); shown in the default language.
export default function GlobalNotFound() {
  return (
    <html lang="en" className={fontVariables}>
      <body className="min-h-dvh bg-canvas text-ink">
        <main className="@container mx-auto flex min-h-dvh max-w-[1440px] flex-col items-center justify-center gap-6 px-4 py-16 text-center">
          <p
            aria-hidden="true"
            style={displayFit('404', { min: '3rem', max: '10rem' })}
            className="font-display text-display-fit leading-[0.8] font-black"
          >
            404
          </p>
          <h1 className="text-3xl font-bold">{en.notFound.title}</h1>
          <p className="max-w-[46ch] leading-relaxed">{en.notFound.body}</p>
          <Link
            href="/"
            className="inline-flex min-h-10 items-center rounded-pill bg-cta px-5 text-[13px] font-bold tracking-[0.03em] text-cta-fg uppercase"
          >
            {en.notFound.back}
          </Link>
        </main>
      </body>
    </html>
  );
}

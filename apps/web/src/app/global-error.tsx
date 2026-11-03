'use client';

import en from '../../messages/en.json';
import { ErrorView, GHOST_LINK_CLASSES } from '@/components/ErrorView';
import { fontVariables } from '@/styles/fonts';
import './globals.css';

// Last-resort boundary for errors in the root layout itself, where translations are unavailable:
// shown in the default language with the same Yoyo styling.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en" className={fontVariables}>
      <body className="min-h-dvh bg-canvas text-ink">
        <ErrorView
          title={en.error.title}
          body={en.error.body}
          retryLabel={en.error.retry}
          onRetry={reset}
          backLink={
            // A full page load on purpose: the app shell itself failed.
            // eslint-disable-next-line @next/next/no-html-link-for-pages
            <a href="/" className={GHOST_LINK_CLASSES}>
              {en.error.back}
            </a>
          }
        />
      </body>
    </html>
  );
}

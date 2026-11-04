import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderResult } from '@testing-library/react';
import type { ApiClient } from '@yoyo/api-client';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';
import { SessionProvider } from '@/lib/session/SessionProvider';
import en from '../../messages/en.json';
import lv from '../../messages/lv.json';
import ru from '../../messages/ru.json';

const messages = { en, lv, ru } as const;
type TestLocale = keyof typeof messages;

/** Renders a component the way the app does: inside next-intl with real messages. */
export function renderWithIntl(ui: ReactElement, locale: TestLocale = 'en'): RenderResult {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages[locale]}>
      {ui}
    </NextIntlClientProvider>,
  );
}

/** Like renderWithIntl, plus a fresh query cache and the session from `client` (see test/fake-api). */
export function renderWithSession(
  ui: ReactElement,
  { client, locale = 'en' }: { client: ApiClient; locale?: TestLocale },
): RenderResult & { queryClient: QueryClient } {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const result = render(
    <NextIntlClientProvider locale={locale} messages={messages[locale]}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider client={client}>{ui}</SessionProvider>
      </QueryClientProvider>
    </NextIntlClientProvider>,
  );
  return { ...result, queryClient };
}

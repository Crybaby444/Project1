import { render, type RenderResult } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';
import en from '../../messages/en.json';
import lv from '../../messages/lv.json';
import ru from '../../messages/ru.json';

const messages = { en, lv, ru } as const;

/** Renders a component the way the app does: inside next-intl with real messages. */
export function renderWithIntl(ui: ReactElement, locale: keyof typeof messages = 'en'): RenderResult {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages[locale]}>
      {ui}
    </NextIntlClientProvider>,
  );
}

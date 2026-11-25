import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeApi, meRoute, testUser } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { LanguageSuggestion } from './LanguageSuggestion';

const push = vi.hoisted(() =>
  vi.fn((_href: string, { locale }: { locale: string; scroll?: boolean }) => {
    setTimeout(() => document.documentElement.setAttribute('lang', locale), 0);
  }),
);

vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/faq',
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }),
}));

function browserPrefers(...languages: string[]) {
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(languages);
}

function renderOn(locale: 'en' | 'lv' | 'ru', person?: ReturnType<typeof testUser>) {
  const api = fakeApi({
    ...meRoute(person ?? null),
    'PATCH /api/v1/me': (body) => ({ status: 200, body: { user: { ...person, ...(body as object) } } }),
  });
  renderWithSession(<LanguageSuggestion />, { client: api.client, locale, hasSession: Boolean(person) });
  return api;
}

afterEach(() => {
  vi.restoreAllMocks();
  push.mockClear();
  document.cookie = 'NEXT_LOCALE=; path=/; max-age=0';
  document.documentElement.setAttribute('lang', 'en');
});

describe('LanguageSuggestion', () => {
  it('asks in the browser’s language, on the page of another language, and never switches by itself', async () => {
    browserPrefers('lv-LV', 'en');
    renderOn('en');
    const bar = await screen.findByRole('region', { name: 'Valodas ieteikums' });
    expect(bar).toHaveAttribute('lang', 'lv');
    expect(bar).toHaveTextContent('Šī lapa ir pieejama arī latviešu valodā.');
    expect(screen.getByRole('button', { name: 'Pāriet' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Palikt' })).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('does not ask when the page is already in the preferred language', async () => {
    browserPrefers('ru-RU');
    renderOn('ru');
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('does not ask again once a choice is remembered', async () => {
    browserPrefers('lv');
    document.cookie = 'NEXT_LOCALE=en; path=/';
    renderOn('en');
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('"Stay" remembers the page’s language and goes away', async () => {
    browserPrefers('ru');
    const user = userEvent.setup();
    renderOn('lv');
    await user.click(await screen.findByRole('button', { name: 'Остаться' }));
    expect(document.cookie).toContain('NEXT_LOCALE=lv');
    expect(screen.queryByRole('region')).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });

  it('"Switch" remembers the language and opens the same page in it', async () => {
    browserPrefers('lv');
    const user = userEvent.setup();
    renderOn('en');
    await user.click(await screen.findByRole('button', { name: 'Pāriet' }));
    expect(document.cookie).toContain('NEXT_LOCALE=lv');
    expect(push).toHaveBeenCalledWith('/faq', { locale: 'lv', scroll: false });
  });

  it('does not ask someone signed in: the profile already keeps their language', async () => {
    browserPrefers('lv');
    const { calls } = renderOn('en', testUser({ locale: 'en' }));
    await waitFor(() =>
      expect(calls.some((call) => call.method === 'GET' && call.path === '/api/v1/me')).toBe(true),
    );
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Pāriet' })).toBeNull());
  });
});

import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import siteLv from '../../../messages/site/lv.json';
import lv from '../../../messages/lv.json';
import { fakeApi, meRoute } from '@/test/fake-api';
import { renderWithSession } from '@/test/render';
import { SiteFooter } from './SiteFooter';

vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/terms',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useSearchParams: () => new URLSearchParams(),
}));

function renderFooter() {
  const { client } = fakeApi(meRoute(null));
  return renderWithSession(<SiteFooter />, { client, locale: 'lv', hasSession: false });
}

describe('SiteFooter', () => {
  it('links every service and legal page in the page language', () => {
    renderFooter();
    const nav = screen.getByRole('navigation', { name: siteLv.footer.pagesLabel });
    const links = within(nav).getAllByRole('link');
    expect(links.map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      [siteLv.footer.links.catalog, '/lv/c'],
      [siteLv.footer.links.howItWorks, '/lv/how-it-works'],
      [siteLv.footer.links.faq, '/lv/faq'],
      [siteLv.footer.links.terms, '/lv/terms'],
      [siteLv.footer.links.privacy, '/lv/privacy'],
      [siteLv.footer.links.cookies, '/lv/cookies'],
    ]);
  });

  it('gives the contact address as an email link', () => {
    renderFooter();
    expect(screen.getAllByRole('link', { name: 'admin@yoyo.rent' })[0]).toHaveAttribute(
      'href',
      'mailto:admin@yoyo.rent',
    );
  });

  it('lets the visitor pick the language and the theme, under names of its own', () => {
    renderFooter();
    const languages = screen.getByRole('navigation', { name: siteLv.footer.languageLabel });
    expect(siteLv.footer.languageLabel).not.toBe(lv.language.label); // the header's switcher has that name
    expect(within(languages).getByRole('link', { name: 'English' })).toHaveAttribute('href', '/en/terms');
    expect(screen.getByRole('radiogroup', { name: lv.theme.label })).toBeInTheDocument();
  });

  it('is the page footer landmark', () => {
    renderFooter();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('is minimal (v16): no giant wordmark, no tagline, no column headings', () => {
    renderFooter();
    const footer = screen.getByRole('contentinfo');
    expect(within(footer).queryByText('YOYO')).toBeNull();
    expect(within(footer).queryByText(siteLv.footer.tagline)).toBeNull();
    expect(footer.querySelectorAll('h2')).toHaveLength(0);
  });
});

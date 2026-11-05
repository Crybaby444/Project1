import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import siteLv from '../../../messages/site/lv.json';
import type { LegalDoc } from '@/content/legal/types';
import { renderWithIntl } from '@/test/render';
import { LegalDocument } from './LegalDocument';

const DOC: LegalDoc = {
  title: 'Noteikumi',
  summary: ['Viss ir vienkārši.'],
  sections: [
    { id: 'about', heading: '1. Par mums', blocks: [{ p: 'Pakalpojumu uztur {operator}. Skatiet [privātuma politiku](/privacy).' }] },
    {
      id: 'contact',
      heading: '2. Kontakti',
      blocks: [
        { p: 'Rakstiet uz [admin@yoyo.rent](mailto:admin@yoyo.rent) vai skatiet [www.dvi.gov.lv](https://www.dvi.gov.lv).' },
        { list: ['viens;', 'divi.'] },
        { table: { head: ['Nosaukums', 'Cik ilgi'], rows: [['yoyo_at', '15 minūtes']] } },
      ],
    },
  ],
};

function renderDoc() {
  return renderWithIntl(<LegalDocument doc={DOC} effective="2026-11-05" />, 'lv');
}

describe('LegalDocument', () => {
  it('has the title as the one h1, the date it takes effect, and the short summary', () => {
    renderDoc();
    expect(screen.getByRole('heading', { level: 1, name: 'Noteikumi' })).toBeInTheDocument();
    expect(screen.getByText(/^Spēkā no /)).toHaveTextContent('2026');
    expect(screen.getByRole('heading', { level: 2, name: siteLv.legal.summary })).toBeInTheDocument();
    expect(screen.getByText('Viss ir vienkārši.')).toBeInTheDocument();
  });

  it('lists every section in the contents, linked to its heading', () => {
    renderDoc();
    const contents = screen.getByRole('navigation', { name: siteLv.legal.contents });
    const links = within(contents).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['#about', '#contact']);
    expect(document.getElementById('about')).toHaveTextContent('1. Par mums');
  });

  it('fills in who runs the service', () => {
    renderDoc();
    expect(screen.getByText(/Pakalpojumu uztur Yoyo uzturētājs Latvijā\./)).toBeInTheDocument();
  });

  it('turns written links into real ones: site pages in the page language, email, and other sites', () => {
    renderDoc();
    expect(screen.getByRole('link', { name: 'privātuma politiku' })).toHaveAttribute('href', '/lv/privacy');
    expect(screen.getByRole('link', { name: 'admin@yoyo.rent' })).toHaveAttribute('href', 'mailto:admin@yoyo.rent');
    const external = screen.getByRole('link', { name: 'www.dvi.gov.lv' });
    expect(external).toHaveAttribute('href', 'https://www.dvi.gov.lv');
    expect(external).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders lists and tables with proper column headers', () => {
    renderDoc();
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toContain('viens;');
    expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['Nosaukums', 'Cik ilgi']);
    expect(screen.getByRole('columnheader', { name: 'Nosaukums' })).toHaveAttribute('scope', 'col');
  });

  it('lets keyboard users scroll a wide table on a phone: its box is a named, focusable region', () => {
    renderDoc();
    const region = screen.getByRole('region', { name: 'Nosaukums, Cik ilgi' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(within(region).getByRole('table')).toBeInTheDocument();
  });
});

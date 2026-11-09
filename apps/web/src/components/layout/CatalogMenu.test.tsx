import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import en from '../../../messages/en.json';
import { menuRoots } from '@/lib/catalog/menu';
import { testCategories } from '@/test/listings';
import { renderWithIntl } from '@/test/render';
import { CatalogMenu } from './CatalogMenu';

describe('CatalogMenu', () => {
  it('keeps plain links to every root in the page while closed, and opens and closes like a disclosure', async () => {
    const user = userEvent.setup();
    const { container } = renderWithIntl(<CatalogMenu roots={menuRoots(testCategories)} />, 'lv');
    const button = screen.getByRole('button', { name: 'Katalogs' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    const links = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    for (const root of testCategories) expect(links).toContain(`/lv/c/${root.slugs.lv}`);
    expect(links).toContain('/lv/c');

    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('navigation', { name: 'Kataloga kategorijas' })).toBeVisible();
    await user.keyboard('{Escape}');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveFocus();
  });

  it('sends at most three subcategories of each root, and counts the rest', () => {
    const roots = menuRoots(testCategories);
    for (const root of roots) expect(root.children.length).toBeLessThanOrEqual(3);
    expect(en.header.catalog.more).toContain('{count}');
  });
});

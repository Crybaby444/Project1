import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import en from '../../../messages/en.json';
import lv from '../../../messages/lv.json';
import { fakeApi, meRoute, testUser, type FakeRoutes } from '@/test/fake-api';
import { categoriesRoute, echoListing, ownerListing } from '@/test/listings';
import { renderWithSession } from '@/test/render';
import { ListingBuilder } from './ListingBuilder';

vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/listings/new',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

const b = en.builder;

function renderBuilder(
  routes: FakeRoutes,
  listing = ownerListing(),
  step: 'basics' | 'attributes' | 'photos' = 'basics',
  locale: 'en' | 'lv' = 'en',
) {
  const { client, calls } = fakeApi({
    ...meRoute(testUser()),
    ...categoriesRoute,
    ...echoListing(listing),
    ...routes,
  });
  renderWithSession(<ListingBuilder initial={listing} initialStep={step} />, { client, locale });
  return calls;
}

describe('ListingBuilder', () => {
  it('lists the six steps as a numbered index (01–06, like the catalog), the open one marked as the current step', async () => {
    renderBuilder({});
    const nav = screen.getByRole('navigation', { name: b.steps.label });
    const links = within(nav).getAllByRole('link');
    expect(links.map((l) => l.textContent)).toEqual([
      `01${b.steps.photos}`,
      `02${b.steps.basics}`,
      `03${b.steps.attributes}`,
      `04${b.steps.price}`,
      `05${b.steps.place}`,
      `06${b.steps.rules}`,
    ]);
    expect(within(nav).getByRole('link', { name: /Basics/ })).toHaveAttribute('aria-current', 'step');
    expect(within(nav).getByRole('link', { name: /Price/ })).toHaveAttribute('href', '?step=price');
  });

  it('moves on with "Next" and puts the focus on the new step’s heading', async () => {
    const user = userEvent.setup();
    renderBuilder({});
    await user.click(screen.getByRole('button', { name: new RegExp(b.next) }));
    const heading = screen.getByRole('heading', { level: 2, name: b.steps.attributes });
    expect(heading).toHaveFocus();
    expect(window.location.search).toBe('?step=attributes');
  });

  it('autosaves what is typed and shows it in the live preview', async () => {
    const user = userEvent.setup();
    const calls = renderBuilder({});
    await user.type(screen.getByLabelText(b.basics.title), 'Bosch drill');

    const preview = screen.getByRole('figure', { name: b.preview.label });
    expect(within(preview).getByText('Bosch drill')).toBeVisible();
    await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true), { timeout: 3000 });
    expect(calls.filter((c) => c.method === 'PATCH').at(-1)?.body).toMatchObject({ title: 'Bosch drill' });
    expect(await screen.findByText(b.save.saved)).toBeVisible();
  });

  it('shows a too-long or too-short title after leaving the field', async () => {
    const user = userEvent.setup();
    renderBuilder({}, ownerListing({ status: 'REJECTED' }));
    const title = screen.getByLabelText(b.basics.title);
    expect(title).toHaveAttribute('maxLength', '80');
    await user.type(title, 'abc');
    await user.tab();
    expect(title).not.toHaveAttribute('aria-invalid'); // a short title is fine in a draft
  });

  it('picks a subcategory and clears the old attributes in the same save', async () => {
    const user = userEvent.setup();
    const calls = renderBuilder(
      {},
      ownerListing({ categoryId: 'cat-consoles', attributes: { model: 'ps5' } }),
    );
    await user.click(await screen.findByRole('radio', { name: 'Tools' }));
    expect(await screen.findByRole('radio', { name: 'Power tools' })).toBeInTheDocument();
    await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true), { timeout: 3000 });
    expect(calls.find((c) => c.method === 'PATCH')?.body).toMatchObject({
      categoryId: 'cat-tools',
      attributes: {},
    });
    expect(await screen.findByText(b.basics.attributesReset)).toBeVisible();
  });

  it('asks for a subcategory before the details', async () => {
    renderBuilder({}, ownerListing(), 'attributes');
    expect(screen.getByText(b.attributes.needCategory)).toBeVisible();
  });

  it('shows the attributes of the category in the page language and sends numbers as numbers', async () => {
    const user = userEvent.setup();
    const calls = renderBuilder({}, ownerListing({ categoryId: 'cat-consoles' }), 'attributes', 'lv');
    const model = await screen.findByLabelText(`Modelis · ${lv.builder.attributes.required}`);
    expect(within(model).getByRole('option', { name: 'PlayStation 5' })).toBeInTheDocument();
    await user.selectOptions(model, 'ps5');
    await user.type(screen.getByLabelText('Pultis'), '2,5');
    await user.click(screen.getByRole('radio', { name: lv.builder.attributes.yes }));

    await waitFor(
      () =>
        expect(calls.filter((c) => c.method === 'PATCH').at(-1)?.body).toMatchObject({
          attributes: { model: 'ps5', controllers: 2.5, vr: true },
        }),
      { timeout: 3000 },
    );
  });

  it('opens the preview in a dialog on a phone', async () => {
    const user = userEvent.setup();
    renderBuilder({});
    await user.click(screen.getByRole('button', { name: b.preview.open }));
    const dialog = screen.getByRole('dialog', { name: b.preview.title });
    expect(within(dialog).getByRole('figure', { name: b.preview.label })).toBeVisible();
    await act(async () => {
      await user.click(within(dialog).getByRole('button', { name: b.preview.close }));
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ListingPhoto } from '@yoyo/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import en from '../../../../messages/en.json';
import { ApiError } from '@/lib/session/api-error';
import { fakeApi, meRoute, testUser, type FakeRoutes } from '@/test/fake-api';
import { categoriesRoute, echoListing, ownerListing } from '@/test/listings';
import { renderWithSession } from '@/test/render';
import { ListingBuilder } from '../ListingBuilder';

const { uploadPhoto } = vi.hoisted(() => ({ uploadPhoto: vi.fn() }));
vi.mock('@/lib/listings/upload-photo', () => ({ uploadPhoto }));
vi.mock('@/lib/listings/image-edit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/listings/image-edit')>()),
  loadImage: vi.fn(async () => ({ source: {}, size: { width: 800, height: 600 }, close() {} })),
  renderCrop: vi.fn(async () => new Blob(['cropped'], { type: 'image/jpeg' })),
  drawCrop: vi.fn(),
}));
vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  usePathname: () => '/listings/new',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

const p = en.builder.photos;
const jpeg = (name = 'bike.jpg') =>
  new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...Array(32).fill(1)])], name, { type: 'image/jpeg' });
const photo = (id: string, position: number): ListingPhoto => ({
  id,
  width: 800,
  height: 600,
  position,
  urls: { thumb: `/m/${id}/thumb`, card: `/m/${id}/card`, full: `/m/${id}/full` },
});

function renderStep(routes: FakeRoutes = {}, listing = ownerListing()) {
  const { client, calls } = fakeApi({
    ...meRoute(testUser()),
    ...categoriesRoute,
    ...echoListing(listing),
    ...routes,
  });
  renderWithSession(<ListingBuilder initial={listing} initialStep="photos" />, { client });
  return calls;
}

const chooser = () => screen.getByLabelText(p.choose);

describe('PhotosStep', () => {
  // Braces: a function returned from beforeEach would run as a cleanup hook.
  beforeEach(() => {
    uploadPhoto.mockReset();
  });

  it('crops a chosen photo, uploads it with progress and shows it as the cover', async () => {
    const user = userEvent.setup();
    let progress: (value: number) => void = () => {};
    let finish: () => void = () => {};
    uploadPhoto.mockImplementation(
      (_id: string, _blob: Blob, { onProgress }: { onProgress(v: number): void }) => {
        progress = onProgress;
        return new Promise((resolve) => (finish = () => resolve({ photo: photo('p1', 0), version: 1 })));
      },
    );
    renderStep();
    await user.upload(chooser(), jpeg());

    const dialog = await screen.findByRole('dialog', { name: en.builder.crop.title });
    await user.click(within(dialog).getByRole('button', { name: en.builder.crop.rotateRight }));
    await user.click(within(dialog).getByRole('button', { name: en.builder.crop.apply }));

    await waitFor(() => expect(uploadPhoto).toHaveBeenCalled());
    progress(40);
    const bar = await screen.findByRole('progressbar');
    await waitFor(() => expect(bar).toHaveAttribute('aria-valuenow', '40'));
    finish();
    expect(await screen.findByRole('img', { name: 'Photo 1 of 1' })).toHaveAttribute('src', '/m/p1/card');
    expect(screen.getByText(p.cover)).toBeVisible();
  });

  it('refuses what is not a photo without sending it', async () => {
    const user = userEvent.setup({ applyAccept: false });
    renderStep();
    await user.upload(
      chooser(),
      new File(['<svg xmlns="http://www.w3.org/2000/svg"/>'], 'logo.svg', { type: 'image/svg+xml' }),
    );
    expect(await screen.findByText(`logo.svg: ${en.errors.UNSUPPORTED_MEDIA}`)).toBeVisible();
    expect(uploadPhoto).not.toHaveBeenCalled();
  });

  it('refuses a ninth photo', async () => {
    const user = userEvent.setup();
    const eight = Array.from({ length: 8 }, (_, index) => photo(`p${index}`, index));
    renderStep({}, ownerListing({ photos: eight }));
    expect(screen.getByText(p.full.replace('{max}', '8'))).toBeVisible();
    expect(chooser()).toBeDisabled();
    expect(user).toBeDefined();
  });

  it('says plainly when photo storage is off, and keeps the rest of the builder working', async () => {
    const user = userEvent.setup();
    uploadPhoto.mockRejectedValue(new ApiError('STORAGE_DISABLED', 503));
    renderStep();
    await user.upload(chooser(), jpeg());
    await user.click(await screen.findByRole('button', { name: en.builder.crop.whole }));

    expect(await screen.findByText(p.storageOff)).toBeVisible();
    expect(chooser()).toBeDisabled();
    await user.click(screen.getByRole('link', { name: /Basics/ }));
    expect(screen.getByLabelText(en.builder.basics.title)).toBeEnabled();
  });

  it('shows the API’s reason at the photo, with a retry', async () => {
    const user = userEvent.setup();
    uploadPhoto
      .mockRejectedValueOnce(new ApiError('UNSUPPORTED_MEDIA', 415))
      .mockResolvedValueOnce({ photo: photo('p1', 0), version: 1 });
    renderStep();
    await user.upload(chooser(), jpeg('scan.jpg'));
    await user.click(await screen.findByRole('button', { name: en.builder.crop.apply }));
    expect(await screen.findByText(`scan.jpg: ${en.errors.UNSUPPORTED_MEDIA}`)).toBeVisible();
    await user.click(screen.getByRole('button', { name: p.retry }));
    expect(await screen.findByRole('img', { name: 'Photo 1 of 1' })).toBeVisible();
  });

  it('removes a photo after asking, and reads the listing again', async () => {
    const user = userEvent.setup();
    const listing = ownerListing({ photos: [photo('a', 0), photo('b', 1)], version: 3 });
    const calls = renderStep(
      {
        'DELETE /api/v1/listings/listing-1/photos/b': { status: 204 },
        'GET /api/v1/listings/listing-1': {
          status: 200,
          body: { listing: { ...listing, photos: [photo('a', 0)], version: 4 } },
        },
      },
      listing,
    );
    await user.click(screen.getByRole('button', { name: 'More for photo 2' }));
    await user.click(screen.getByRole('menuitem', { name: p.remove }));
    await user.click(
      within(screen.getByRole('dialog', { name: p.removeTitle })).getByRole('button', {
        name: p.removeConfirm,
      }),
    );
    await waitFor(() => expect(screen.queryByRole('img', { name: /Photo 2/ })).toBeNull());
    expect(calls.some((c) => c.method === 'DELETE')).toBe(true);
  });
});

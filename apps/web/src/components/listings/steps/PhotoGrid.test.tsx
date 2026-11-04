import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ListingPhoto } from '@yoyo/shared';
import { describe, expect, it, vi } from 'vitest';
import en from '../../../../messages/en.json';
import { renderWithIntl } from '@/test/render';
import { PhotoGrid } from './PhotoGrid';

const p = en.builder.photos;
const photo = (id: string, position: number): ListingPhoto => ({
  id,
  width: 800,
  height: 600,
  position,
  urls: { thumb: `/${id}/t`, card: `/${id}/c`, full: `/${id}/f` },
});
const three = [photo('a', 0), photo('b', 1), photo('c', 2)];

function renderGrid() {
  const onReorder = vi.fn();
  renderWithIntl(<PhotoGrid photos={three} disabled={false} onReorder={onReorder} onRemove={vi.fn()} />);
  const status = () => screen.getByRole('status').textContent;
  return { onReorder, status };
}

describe('PhotoGrid', () => {
  it('moves a photo with the keyboard: Space, arrows, Space, announcing each step', async () => {
    const user = userEvent.setup();
    const { onReorder, status } = renderGrid();
    screen.getByRole('button', { name: 'Move photo 3' }).focus();

    await user.keyboard(' ');
    expect(status()).toBe('Photo 3 picked up, at position 3 of 3.');
    expect(screen.getByRole('button', { name: 'Move photo 3' })).toHaveAttribute('aria-pressed', 'true');
    await user.keyboard('{ArrowLeft}');
    expect(status()).toBe('Position 2 of 3.');
    await user.keyboard('{ArrowLeft}');
    // The photo now first is labelled as photo 1 and keeps the focus.
    expect(screen.getByRole('button', { name: 'Move photo 1' })).toHaveFocus();
    await user.keyboard(' ');

    expect(onReorder).toHaveBeenCalledWith(['c', 'a', 'b']);
    expect(status()).toBe('Photo dropped at position 1 of 3.');
    expect(within(screen.getAllByRole('listitem')[0]!).getByText(p.cover)).toBeVisible();
  });

  it('puts the photo back on Escape and saves nothing', async () => {
    const user = userEvent.setup();
    const { onReorder, status } = renderGrid();
    screen.getByRole('button', { name: 'Move photo 1' }).focus();
    await user.keyboard(' {ArrowRight}{Escape}');
    expect(onReorder).not.toHaveBeenCalled();
    expect(status()).toBe('Move cancelled. The photo is back at position 1.');
    expect(screen.getAllByRole('img').map((img) => img.getAttribute('src'))).toEqual([
      '/a/c',
      '/b/c',
      '/c/c',
    ]);
  });

  it('makes a photo the cover from its menu', async () => {
    const user = userEvent.setup();
    const { onReorder } = renderGrid();
    await user.click(screen.getByRole('button', { name: 'More for photo 2' }));
    await user.click(screen.getByRole('menuitem', { name: p.makeCover }));
    expect(onReorder).toHaveBeenCalledWith(['b', 'a', 'c']);
  });

  it('offers no "earlier" for the cover and no "later" for the last one', async () => {
    const user = userEvent.setup();
    renderGrid();
    await user.click(screen.getByRole('button', { name: 'More for photo 1' }));
    expect(screen.queryByRole('menuitem', { name: p.earlier })).toBeNull();
    expect(screen.getByRole('menuitem', { name: p.later })).toBeVisible();
  });
});

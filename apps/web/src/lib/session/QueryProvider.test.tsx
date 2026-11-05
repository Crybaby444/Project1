import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { QueryProvider } from './QueryProvider';

function Spy({ seen }: { seen: QueryClient[] }) {
  seen.push(useQueryClient());
  return null;
}

describe('QueryProvider', () => {
  it('keeps one cache for the tab even when the layout mounts afresh (a language switch)', () => {
    const seen: QueryClient[] = [];
    const first = render(
      <QueryProvider>
        <Spy seen={seen} />
      </QueryProvider>,
    );
    first.unmount();
    // Next mounts the [locale] layout again for the new language: the signed-in user must still be
    // known at once, or the header shows a placeholder until GET /me answers.
    render(
      <QueryProvider>
        <Spy seen={seen} />
      </QueryProvider>,
    );
    expect(seen.length).toBeGreaterThanOrEqual(2);
    expect(new Set(seen).size).toBe(1);
  });
});

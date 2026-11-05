import { describe, expect, it, vi } from 'vitest';
import { loadCategories } from './categories';

const TREE = {
  categories: [
    {
      id: 'c1',
      slug: 'tools',
      sticker: 'sun',
      icon: 'drill',
      names: { en: 'Tools', lv: 'Instrumenti', ru: 'Инструменты' },
      attributes: [],
      children: [],
    },
  ],
};

const reply = (status: number, body: unknown) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));

describe('loadCategories', () => {
  it('returns the category tree the API sends', async () => {
    const fetchImpl = reply(200, TREE);
    expect(await loadCategories({ fetchImpl, apiOrigin: 'http://api.test' })).toEqual({
      ok: true,
      categories: TREE.categories,
    });
    expect(fetchImpl).toHaveBeenCalledWith('http://api.test/api/v1/categories', expect.anything());
  });

  it('is not ok when the API answers with an error', async () => {
    expect(await loadCategories({ fetchImpl: reply(503, { error: { code: 'X' } }), apiOrigin: 'http://api.test' })).toEqual({
      ok: false,
    });
  });

  it('is not ok when the answer is not a category tree', async () => {
    expect(await loadCategories({ fetchImpl: reply(200, { categories: [{ slug: 1 }] }), apiOrigin: 'http://api.test' })).toEqual({
      ok: false,
    });
  });

  it('gives up on an API that does not answer, instead of holding the page (Render may be asleep)', async () => {
    const never = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
        }),
    );
    const started = Date.now();
    expect(await loadCategories({ fetchImpl: never, apiOrigin: 'http://api.test', timeoutMs: 50 })).toEqual({ ok: false });
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it('is not ok when the network fails', async () => {
    const fails = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    expect(await loadCategories({ fetchImpl: fails, apiOrigin: 'http://api.test' })).toEqual({ ok: false });
  });
});

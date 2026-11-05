import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/session/api-error';
import { uploadPhoto } from './upload-photo';

type Reply = { status: number; body?: unknown; headers?: Record<string, string>; progress?: number[] };

/** A stand-in for XMLHttpRequest that answers each send with the next reply. */
function fakeXhr(replies: Reply[]) {
  const sent: { url: string; body: FormData }[] = [];
  class FakeXhr {
    status = 0;
    responseText = '';
    upload = {
      onprogress: null as null | ((e: { lengthComputable: boolean; loaded: number; total: number }) => void),
    };
    onload: null | (() => void) = null;
    onerror: null | (() => void) = null;
    onabort: null | (() => void) = null;
    private url = '';
    private headers: Record<string, string> = {};
    open(_method: string, url: string) {
      this.url = url;
    }
    getResponseHeader(name: string) {
      return this.headers[name.toLowerCase()] ?? null;
    }
    abort() {
      this.onabort?.();
    }
    send(body: FormData) {
      sent.push({ url: this.url, body });
      const reply = replies.shift()!;
      queueMicrotask(() => {
        for (const percent of reply.progress ?? [])
          this.upload.onprogress?.({ lengthComputable: true, loaded: percent, total: 100 });
        this.status = reply.status;
        this.headers = Object.fromEntries(
          Object.entries(reply.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]),
        );
        this.responseText = reply.body === undefined ? '' : JSON.stringify(reply.body);
        if (reply.status === 0) this.onerror?.();
        else this.onload?.();
      });
    }
  }
  return { sent, create: () => new FakeXhr() as unknown as XMLHttpRequest };
}

const photo = { id: 'p1', width: 800, height: 600, position: 0, urls: { thumb: 't', card: 'c', full: 'f' } };
const error = (code: string) => ({ error: { code, message: code } });

describe('uploadPhoto', () => {
  it('sends the file as multipart and reports the progress', async () => {
    const xhr = fakeXhr([{ status: 201, body: { photo, version: 3 }, progress: [0, 50, 100] }]);
    const onProgress = vi.fn();
    const result = await uploadPhoto('l1', new Blob(['x']), { onProgress, createXhr: xhr.create });
    expect(result).toEqual({ photo, version: 3 });
    expect(onProgress.mock.calls.map(([value]) => value)).toEqual([0, 50, 100]);
    expect(xhr.sent[0]!.url).toBe('/api/v1/listings/l1/photos');
    expect(xhr.sent[0]!.body.get('file')).toBeInstanceOf(Blob);
  });

  it('renews an expired session once and sends again', async () => {
    const xhr = fakeXhr([
      { status: 401, body: error('TOKEN_EXPIRED') },
      { status: 201, body: { photo, version: 1 } },
    ]);
    const refresh = vi.fn(async () => true);
    await uploadPhoto('l1', new Blob(['x']), { createXhr: xhr.create, refresh });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(xhr.sent).toHaveLength(2);
  });

  it('turns the API’s refusal into an ApiError (503 storage disabled)', async () => {
    const xhr = fakeXhr([{ status: 503, body: error('STORAGE_DISABLED') }]);
    await expect(uploadPhoto('l1', new Blob(['x']), { createXhr: xhr.create })).rejects.toMatchObject({
      code: 'STORAGE_DISABLED',
      status: 503,
    });
  });

  it('reports a lost connection as NETWORK', async () => {
    const xhr = fakeXhr([{ status: 0 }]);
    const failure = await uploadPhoto('l1', new Blob(['x']), { createXhr: xhr.create }).catch(
      (e: unknown) => e,
    );
    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as ApiError).code).toBe('NETWORK');
  });
});

import { PhotoUploadResponseSchema, type PhotoUploadResponse } from '@yoyo/shared';
import { ApiError, toApiError } from '@/lib/session/api-error';
import { refreshOnce } from '@/lib/session/fetch-with-refresh';

type UploadOptions = {
  /** 0–100 as the bytes go out. */
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
  /** Tests replace these. */
  createXhr?: () => XMLHttpRequest;
  refresh?: () => Promise<boolean>;
};

type Answer = { status: number; body: unknown; headers: Headers };

function send(url: string, file: Blob, { onProgress, signal, createXhr }: UploadOptions): Promise<Answer> {
  return new Promise((resolve, reject) => {
    const xhr = createXhr ? createXhr() : new XMLHttpRequest();
    const form = new FormData();
    form.append('file', file, 'photo.jpg');
    xhr.open('POST', url);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      let body: unknown;
      try {
        body = xhr.responseText ? JSON.parse(xhr.responseText) : undefined;
      } catch {
        body = undefined;
      }
      const headers = new Headers();
      const retryAfter = xhr.getResponseHeader('retry-after');
      if (retryAfter) headers.set('retry-after', retryAfter);
      resolve({ status: xhr.status, body, headers });
    };
    xhr.onerror = () => reject(ApiError.network());
    xhr.onabort = () => reject(new DOMException('The upload was cancelled', 'AbortError'));
    signal?.addEventListener('abort', () => xhr.abort(), { once: true });
    xhr.send(form);
  });
}

const SESSION_ENDED = new Set(['AUTH_UNAUTHENTICATED', 'TOKEN_EXPIRED']);

/**
 * Uploads one listing photo (`POST /api/v1/listings/:id/photos`, field `file`) through the site's own
 * /api proxy. XMLHttpRequest rather than fetch, for the upload progress. An expired session is renewed
 * once (the same single-flight refresh as every other request) and the upload sent again.
 */
export async function uploadPhoto(
  listingId: string,
  file: Blob,
  options: UploadOptions = {},
): Promise<PhotoUploadResponse> {
  const url = `/api/v1/listings/${encodeURIComponent(listingId)}/photos`;
  const refresh = options.refresh ?? refreshOnce;
  let answer = await send(url, file, options);
  const code = (answer.body as { error?: { code?: string } } | undefined)?.error?.code;
  if (answer.status === 401 && code && SESSION_ENDED.has(code) && (await refresh())) {
    options.onProgress?.(0);
    answer = await send(url, file, options);
  }
  if (answer.status === 201) {
    const parsed = PhotoUploadResponseSchema.safeParse(answer.body);
    if (parsed.success) return parsed.data;
  }
  throw toApiError(
    new Response(null, { status: answer.status === 201 ? 500 : answer.status, headers: answer.headers }),
    answer.body,
  );
}

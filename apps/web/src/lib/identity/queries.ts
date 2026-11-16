'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IdentityStateSchema, type IdentityDecision, type IdentityDocument, type IdentityState } from '@yoyo/shared';
import { ApiError, toApiError, unwrap } from '@/lib/session/api-error';
import { refreshOnce } from '@/lib/session/fetch-with-refresh';
import { useApiClient, useSession } from '@/lib/session/SessionProvider';

const KEY = ['me', 'identity'] as const;
const QUEUE = ['admin', 'identity'] as const;

export function useIdentityState(enabled = true) {
  const client = useApiClient();
  return useQuery({ queryKey: KEY, enabled, queryFn: () => unwrap(client.GET('/api/v1/me/identity')) });
}

async function post(form: FormData): Promise<Response> {
  return fetch('/api/v1/me/identity', { method: 'POST', body: form, credentials: 'same-origin' });
}

/** Sends the two photos (multipart, through the site's /api proxy); renews an expired session once. */
export async function submitIdentity(documentType: IdentityDocument, document: Blob, selfie: Blob): Promise<IdentityState> {
  const form = () => {
    const f = new FormData();
    f.append('documentType', documentType);
    f.append('consent', 'true');
    f.append('document', document, 'document.jpg');
    f.append('selfie', selfie, 'selfie.jpg');
    return f;
  };
  let res: Response;
  try {
    res = await post(form());
    if (res.status === 401 && (await refreshOnce())) res = await post(form());
  } catch {
    throw ApiError.network();
  }
  const body: unknown = await res.json().catch(() => undefined);
  if (res.status === 201) {
    const parsed = IdentityStateSchema.safeParse(body);
    if (parsed.success) return parsed.data;
  }
  throw toApiError(new Response(null, { status: res.status === 201 ? 500 : res.status, headers: res.headers }), body);
}

export function useSubmitIdentity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { documentType: IdentityDocument; document: Blob; selfie: Blob }) => submitIdentity(input.documentType, input.document, input.selfie),
    onSuccess: (state) => queryClient.setQueryData(KEY, state),
  });
}

export function useIdentityQueue() {
  const client = useApiClient();
  return useQuery({ queryKey: QUEUE, queryFn: () => unwrap(client.GET('/api/v1/admin/identity')), refetchInterval: 60_000 });
}

/** A photo for the moderator, as an object URL (the API never lets it be cached). */
export function useIdentityPhoto(id: string, which: 'document' | 'selfie') {
  const client = useApiClient();
  const { status } = useSession();
  return useQuery({
    queryKey: [...QUEUE, id, which],
    enabled: status === 'authenticated',
    gcTime: 0,
    queryFn: async () => {
      const { data, response } = await client.GET('/api/v1/admin/identity/{id}/{which}', { params: { path: { id, which } }, parseAs: 'blob' });
      if (!response.ok || !data) throw toApiError(response, undefined);
      return URL.createObjectURL(data as Blob);
    },
  });
}

export function useDecideIdentity() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: IdentityDecision }) =>
      unwrap(client.POST('/api/v1/admin/identity/{id}', { params: { path: { id } }, body: decision })),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: QUEUE }),
  });
}

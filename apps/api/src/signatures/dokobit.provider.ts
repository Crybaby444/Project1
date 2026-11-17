import { createHash } from 'node:crypto';
import { Logger } from '@nestjs/common';
import type { Locale } from '@yoyo/shared';
import { AppError } from '../common/app-error';
import type { SignatureProvider, SigningRequest, SigningState, StartedSigning } from './signature.provider';

const LANGUAGES: Record<Locale, string> = { en: 'en', lv: 'lv', ru: 'ru' };

type Answer = { status?: string; message?: string } & Record<string, unknown>;

/**
 * Dokobit Documents Gateway (https://gateway-sandbox.dokobit.com/api/doc): upload the contract PDF, wait
 * until it is `uploaded`, create a `pdf` signing for one signer, and hand the site that signer's page.
 * The access token travels as `access_token` in the query, forms are url-encoded, `status: ok` means done.
 *
 * Postbacks carry no signature of their own, so `state` asks Dokobit's status endpoint with Yoyo's own
 * token; the response is read defensively (a signer counts as signed only when Dokobit says so for that
 * signer id). Check it against the sandbox before switching on (docs/SIGNATURES-DOKOBIT.md).
 */
export class DokobitSignatureProvider implements SignatureProvider {
  readonly name = 'DOKOBIT';
  private readonly logger = new Logger('Dokobit');
  private readonly apiUrl: string;

  constructor(private readonly options: { accessToken: string; apiUrl: string; pollMs?: number }) {
    this.apiUrl = options.apiUrl.replace(/\/$/, '');
  }

  private url(action: string): string {
    return `${this.apiUrl}/api/${action}.json?access_token=${encodeURIComponent(this.options.accessToken)}`;
  }

  private async call(action: string, form?: Record<string, string>): Promise<Answer> {
    const res = await fetch(this.url(action), {
      method: form ? 'POST' : 'GET',
      ...(form && { headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(form) }),
      signal: AbortSignal.timeout(30_000),
    });
    const json = (await res.json().catch(() => ({}))) as Answer;
    if (!res.ok || json.status !== 'ok') {
      this.logger.error(`${action}: ${res.status} ${json.message ?? json.status ?? ''}`);
      throw new AppError('INTERNAL', 502, 'The signing provider did not answer as expected');
    }
    return json;
  }

  async start(request: SigningRequest): Promise<StartedSigning> {
    const uploaded = await this.call('file/upload', {
      'file[name]': request.fileName,
      'file[digest]': createHash('sha256').update(request.pdf).digest('hex'),
      'file[content]': request.pdf.toString('base64'),
    });
    const fileToken = String(uploaded['token'] ?? '');
    for (let attempt = 0; ; attempt++) {
      const state = await this.call(`file/upload/${encodeURIComponent(fileToken)}/status`);
      if (state['status'] === 'ok' && (state['file_status'] ?? state['upload_status'] ?? 'uploaded') === 'uploaded') break;
      if (attempt >= 9) throw new AppError('INTERNAL', 502, 'The contract did not reach the signing provider');
      await new Promise((resolve) => setTimeout(resolve, this.options.pollMs ?? 500));
    }
    const created = await this.call('signing/create', {
      type: 'pdf',
      name: request.title,
      language: LANGUAGES[request.language],
      postback_url: request.postbackUrl,
      'files[0][token]': fileToken,
      'signers[0][id]': request.signer.id,
      'signers[0][name]': request.signer.name,
      'signers[0][surname]': request.signer.surname,
      'signers[0][signing_purpose]': 'signature',
    });
    const token = String(created['token'] ?? '');
    const signers = (created['signers'] ?? {}) as Record<string, string>;
    const signerToken = signers[request.signer.id] ?? Object.values(signers)[0];
    if (!token || !signerToken) throw new AppError('INTERNAL', 502, 'The signing provider did not open a signing');
    return { token, url: `${this.apiUrl}/signing/${encodeURIComponent(token)}?access_token=${encodeURIComponent(signerToken)}` };
  }

  async state(token: string, signerId: string): Promise<SigningState> {
    const json = await this.call(`signing/${encodeURIComponent(token)}/status`);
    const raw = json['signers'];
    const list = Array.isArray(raw) ? raw : raw && typeof raw === 'object' ? Object.entries(raw).map(([id, v]) => ({ id, ...(v as object) })) : [];
    const signer = (list as Array<Record<string, unknown>>).find((s) => s['id'] === signerId || s['signer_id'] === signerId);
    const status = String(signer?.['status'] ?? json['signing_status'] ?? '');
    if (status === 'signed' || status === 'completed') return { status: 'SIGNED', method: `DOKOBIT:${String(signer?.['signing_option'] ?? 'eid')}` };
    if (status === 'declined' || status === 'expired' || status === 'canceled' || status === 'cancelled') return { status: 'FAILED', reason: status };
    return { status: 'PENDING' };
  }
}

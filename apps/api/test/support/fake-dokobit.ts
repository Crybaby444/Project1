import { createHash, randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

/**
 * A local stand-in for Dokobit Documents Gateway: file upload (base64), its status, signing create and
 * status. It checks `access_token` and the file's SHA-256 like Dokobit; `sign(token)` is the person
 * finishing on Dokobit's page with Smart-ID.
 */
export interface FakeDokobit {
  url: string;
  accessToken: string;
  signings: Map<string, { signerId: string; name: string; surname: string; signed: boolean; language: string }>;
  sign(token: string): void;
  close(): Promise<void>;
}

function body(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk: Buffer) => (data += chunk.toString()));
    req.on('end', () => resolve(data));
  });
}

export async function startFakeDokobit(): Promise<FakeDokobit> {
  const accessToken = 'dokobit-test-token-0123';
  const files = new Set<string>();
  const signings: FakeDokobit['signings'] = new Map();
  let n = 0;
  const run = randomUUID().slice(0, 8);
  const server: Server = createServer((req, res) => {
    void (async () => {
      const send = (status: number, json: unknown) => res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(json));
      const url = new URL(req.url ?? '/', 'http://x');
      if (url.searchParams.get('access_token') !== accessToken) return send(403, { status: 'error', message: 'Access denied' });
      const form = new URLSearchParams(await body(req));
      const path = url.pathname;
      if (req.method === 'POST' && path === '/api/file/upload.json') {
        const content = Buffer.from(form.get('file[content]') ?? '', 'base64');
        if (createHash('sha256').update(content).digest('hex') !== form.get('file[digest]')) return send(400, { status: 'error', message: 'Digest mismatch' });
        const token = `file${run}${++n}`;
        files.add(token);
        return send(200, { status: 'ok', token });
      }
      const fileStatus = path.match(/^\/api\/file\/upload\/([^/]+)\/status\.json$/);
      if (req.method === 'GET' && fileStatus) return files.has(fileStatus[1]!) ? send(200, { status: 'ok', file_status: 'uploaded' }) : send(404, { status: 'error' });
      if (req.method === 'POST' && path === '/api/signing/create.json') {
        if (form.get('type') !== 'pdf' || !files.has(form.get('files[0][token]') ?? '')) return send(400, { status: 'error', message: 'Bad signing' });
        const token = `signing${run}${++n}`;
        const signerId = form.get('signers[0][id]') ?? '';
        signings.set(token, { signerId, name: form.get('signers[0][name]') ?? '', surname: form.get('signers[0][surname]') ?? '', signed: false, language: form.get('language') ?? '' });
        return send(200, { status: 'ok', token, signers: { [signerId]: `signer-${token}` } });
      }
      const signingStatus = path.match(/^\/api\/signing\/([^/]+)\/status\.json$/);
      if (req.method === 'GET' && signingStatus) {
        const signing = signings.get(signingStatus[1]!);
        if (!signing) return send(404, { status: 'error', message: 'Not found' });
        return send(200, {
          status: 'ok',
          signers: { [signing.signerId]: { status: signing.signed ? 'signed' : 'pending', ...(signing.signed && { signing_option: 'smartid' }) } },
        });
      }
      send(404, { status: 'error', message: 'Unknown endpoint' });
    })();
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    accessToken,
    signings,
    sign: (token) => {
      const signing = signings.get(token);
      if (signing) signing.signed = true;
    },
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

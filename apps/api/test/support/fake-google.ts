import { createHash, randomBytes } from 'node:crypto';
import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';

export interface GoogleIdentity {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
}

interface IssuedCode {
  identity: GoogleIdentity;
  challenge: string;
  redirectUri: string;
  nonce: string | null;
}

export interface FakeGoogle {
  clientId: string;
  clientSecret: string;
  authUrl: string;
  tokenUrl: string;
  jwksUrl: string;
  /** The account the next person who passes the consent screen signs in as. */
  signInAs(identity: GoogleIdentity): void;
  close(): Promise<void>;
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

/**
 * A local stand-in for Google's OAuth endpoints: the consent screen (authorize), the token endpoint
 * (checks client credentials, redirect URI and PKCE) and the JWKS that verifies its RS256 id_tokens.
 */
export async function startFakeGoogle(now: () => Date): Promise<FakeGoogle> {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(publicKey)), kid: 'fake-google-key', alg: 'RS256', use: 'sig' };
  const clientId = 'yoyo-test.apps.googleusercontent.com';
  const clientSecret = 'fake-google-client-secret';
  const codes = new Map<string, IssuedCode>();
  let identity: GoogleIdentity | undefined;

  const server: Server = createServer((req, res) => {
    void (async () => {
      const url = new URL(req.url ?? '/', 'http://fake-google');
      if (req.method === 'GET' && url.pathname === '/authorize') {
        const p = url.searchParams;
        if (p.get('client_id') !== clientId || p.get('response_type') !== 'code' || p.get('code_challenge_method') !== 'S256' || !identity) {
          res.writeHead(400).end('bad authorize request');
          return;
        }
        const code = randomBytes(16).toString('hex');
        codes.set(code, {
          identity,
          challenge: p.get('code_challenge') ?? '',
          redirectUri: p.get('redirect_uri') ?? '',
          nonce: p.get('nonce'),
        });
        const back = new URL(p.get('redirect_uri') ?? '');
        back.searchParams.set('code', code);
        back.searchParams.set('state', p.get('state') ?? '');
        res.writeHead(302, { location: back.toString() }).end();
        return;
      }
      if (req.method === 'POST' && url.pathname === '/token') {
        const form = new URLSearchParams(await readBody(req));
        const issued = codes.get(form.get('code') ?? '');
        const verifier = form.get('code_verifier') ?? '';
        const challengeOk = issued && createHash('sha256').update(verifier).digest('base64url') === issued.challenge;
        if (
          !issued ||
          !challengeOk ||
          form.get('grant_type') !== 'authorization_code' ||
          form.get('client_id') !== clientId ||
          form.get('client_secret') !== clientSecret ||
          form.get('redirect_uri') !== issued.redirectUri
        ) {
          res.writeHead(400, { 'content-type': 'application/json' }).end(JSON.stringify({ error: 'invalid_grant' }));
          return;
        }
        codes.delete(form.get('code')!);
        const iat = Math.floor(now().getTime() / 1000);
        const idToken = await new SignJWT({
          email: issued.identity.email,
          email_verified: issued.identity.email_verified,
          ...(issued.identity.name && { name: issued.identity.name }),
          ...(issued.nonce && { nonce: issued.nonce }),
        })
          .setProtectedHeader({ alg: 'RS256', kid: jwk.kid })
          .setIssuer('https://accounts.google.com')
          .setAudience(clientId)
          .setSubject(issued.identity.sub)
          .setIssuedAt(iat)
          .setExpirationTime(iat + 3600)
          .sign(privateKey);
        res
          .writeHead(200, { 'content-type': 'application/json' })
          .end(JSON.stringify({ access_token: 'fake-access', id_token: idToken, token_type: 'Bearer', expires_in: 3600 }));
        return;
      }
      if (req.method === 'GET' && url.pathname === '/jwks') {
        res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ keys: [jwk] }));
        return;
      }
      res.writeHead(404).end();
    })();
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  return {
    clientId,
    clientSecret,
    authUrl: `${base}/authorize`,
    tokenUrl: `${base}/token`,
    jwksUrl: `${base}/jwks`,
    signInAs: (next) => {
      identity = next;
    },
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

/** Environment that points the API at the fake. */
export function googleEnv(google: FakeGoogle): Record<string, string> {
  return {
    GOOGLE_CLIENT_ID: google.clientId,
    GOOGLE_CLIENT_SECRET: google.clientSecret,
    GOOGLE_AUTH_URL: google.authUrl,
    GOOGLE_TOKEN_URL: google.tokenUrl,
    GOOGLE_JWKS_URL: google.jwksUrl,
  };
}

import { randomBytes } from 'node:crypto';
import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { exportJWK, exportPKCS8, generateKeyPair, jwtVerify, SignJWT } from 'jose';

export interface AppleIdentity {
  sub: string;
  email: string;
  /** Apple sends a real address or a private relay one; both are verified. */
  is_private_email?: boolean;
  /** Apple gives the name once, on the first sign-in, in the form it posts back. */
  firstName?: string;
  lastName?: string;
}

interface IssuedCode {
  identity: AppleIdentity;
  redirectUri: string;
  nonce: string | null;
}

export interface FakeApple {
  clientId: string;
  teamId: string;
  keyId: string;
  /** The .p8 key (PKCS#8 PEM) the API signs its client secret with. */
  privateKeyPem: string;
  authUrl: string;
  tokenUrl: string;
  jwksUrl: string;
  signInAs(identity: AppleIdentity): void;
  /** What Apple would post to the redirect URI after the consent screen (form_post). */
  consent(authorizeUrl: string): Promise<{ redirectUri: string; form: Record<string, string> }>;
  close(): Promise<void>;
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

/**
 * A local stand-in for Sign in with Apple: the authorize step (answers with the form Apple would post),
 * the token endpoint (checks the ES256 client secret signed with the team's key) and the JWKS of its
 * RS256 id_tokens.
 */
export async function startFakeApple(now: () => Date): Promise<FakeApple> {
  const signing = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(signing.publicKey)), kid: 'fake-apple-key', alg: 'RS256', use: 'sig' };
  const team = await generateKeyPair('ES256', { extractable: true });
  const privateKeyPem = await exportPKCS8(team.privateKey);
  const clientId = 'rent.yoyo.signin';
  const teamId = 'TEAM123456';
  const keyId = 'KEY1234567';
  const codes = new Map<string, IssuedCode>();
  let identity: AppleIdentity | undefined;

  const server: Server = createServer((req, res) => {
    void (async () => {
      const url = new URL(req.url ?? '/', 'http://fake-apple');
      if (req.method === 'POST' && url.pathname === '/auth/token') {
        const form = new URLSearchParams(await readBody(req));
        const issued = codes.get(form.get('code') ?? '');
        let secretOk = false;
        try {
          const { payload, protectedHeader } = await jwtVerify(form.get('client_secret') ?? '', team.publicKey, {
            algorithms: ['ES256'],
            issuer: teamId,
            audience: 'https://appleid.apple.com',
            subject: clientId,
            currentDate: now(),
          });
          secretOk = protectedHeader.kid === keyId && typeof payload.exp === 'number';
        } catch {
          secretOk = false;
        }
        if (!issued || !secretOk || form.get('grant_type') !== 'authorization_code' || form.get('client_id') !== clientId || form.get('redirect_uri') !== issued.redirectUri) {
          res.writeHead(400, { 'content-type': 'application/json' }).end(JSON.stringify({ error: 'invalid_grant' }));
          return;
        }
        codes.delete(form.get('code')!);
        const iat = Math.floor(now().getTime() / 1000);
        const idToken = await new SignJWT({
          email: issued.identity.email,
          email_verified: 'true',
          is_private_email: issued.identity.is_private_email ? 'true' : 'false',
          ...(issued.nonce && { nonce: issued.nonce }),
        })
          .setProtectedHeader({ alg: 'RS256', kid: jwk.kid })
          .setIssuer('https://appleid.apple.com')
          .setAudience(clientId)
          .setSubject(issued.identity.sub)
          .setIssuedAt(iat)
          .setExpirationTime(iat + 600)
          .sign(signing.privateKey);
        res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ id_token: idToken, access_token: 'fake', token_type: 'Bearer' }));
        return;
      }
      if (req.method === 'GET' && url.pathname === '/auth/keys') {
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
    teamId,
    keyId,
    privateKeyPem,
    authUrl: `${base}/auth/authorize`,
    tokenUrl: `${base}/auth/token`,
    jwksUrl: `${base}/auth/keys`,
    signInAs: (next) => {
      identity = next;
    },
    consent: async (authorizeUrl) => {
      const p = new URL(authorizeUrl).searchParams;
      if (p.get('client_id') !== clientId || p.get('response_type') !== 'code' || p.get('response_mode') !== 'form_post' || !identity) {
        throw new Error('bad authorize request');
      }
      const code = randomBytes(16).toString('hex');
      codes.set(code, { identity, redirectUri: p.get('redirect_uri') ?? '', nonce: p.get('nonce') });
      const form: Record<string, string> = { code, state: p.get('state') ?? '' };
      if (identity.firstName || identity.lastName) {
        form['user'] = JSON.stringify({ name: { firstName: identity.firstName, lastName: identity.lastName }, email: identity.email });
      }
      return { redirectUri: p.get('redirect_uri') ?? '', form };
    },
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

/** Environment that points the API at the fake. */
export function appleEnv(apple: FakeApple): Record<string, string> {
  return {
    APPLE_CLIENT_ID: apple.clientId,
    APPLE_TEAM_ID: apple.teamId,
    APPLE_KEY_ID: apple.keyId,
    APPLE_PRIVATE_KEY: apple.privateKeyPem,
    APPLE_AUTH_URL: apple.authUrl,
    APPLE_TOKEN_URL: apple.tokenUrl,
    APPLE_JWKS_URL: apple.jwksUrl,
  };
}

import { createHash } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import sharp from 'sharp';

export interface CloudinaryUpload {
  publicId: string;
  params: Record<string, string>;
  file: Buffer;
}

export interface FakeCloudinary {
  cloud: string;
  apiKey: string;
  apiSecret: string;
  /** `cloudinary://<key>:<secret>@<cloud>` */
  url: string;
  apiUrl: string;
  uploads: Map<string, CloudinaryUpload>;
  destroyed: string[];
  /** Requests whose signature did not match. */
  badSignatures: number;
  close(): Promise<void>;
}

/** Cloudinary's signature: SHA-1 of the sorted `key=value` pairs joined by `&`, then the secret. */
export function cloudinarySignature(params: Record<string, string>, secret: string): string {
  const signed = Object.keys(params)
    .filter((key) => !['file', 'api_key', 'signature', 'resource_type', 'cloud_name'].includes(key))
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return createHash('sha1').update(signed + secret).digest('hex');
}

/**
 * A local stand-in for Cloudinary's upload API (`/v1_1/<cloud>/image/upload` and `/image/destroy`). It
 * checks the API key and the signature like the real one, keeps uploads in memory and answers with
 * their size.
 */
export async function startFakeCloudinary(): Promise<FakeCloudinary> {
  const cloud = 'yoyo-test';
  const apiKey = '123456789012345';
  const apiSecret = 'fake-cloudinary-secret';
  const uploads = new Map<string, CloudinaryUpload>();
  const destroyed: string[] = [];
  const state = { badSignatures: 0 };

  const server: Server = createServer((req, res) => {
    void (async () => {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk as Buffer);
      const reply = (status: number, body: unknown) =>
        res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(body));
      const form = await new Request('http://fake', {
        method: 'POST',
        headers: { 'content-type': req.headers['content-type'] ?? '' },
        body: Buffer.concat(chunks),
      }).formData();
      const params: Record<string, string> = {};
      let file: Buffer | undefined;
      for (const [key, value] of form.entries()) {
        if (typeof value === 'string') params[key] = value;
        else file = Buffer.from(await value.arrayBuffer());
      }
      if (params['api_key'] !== apiKey) return reply(401, { error: { message: 'Invalid api_key' } });
      if (params['signature'] !== cloudinarySignature(params, apiSecret)) {
        state.badSignatures++;
        return reply(401, { error: { message: 'Invalid Signature' } });
      }
      if (req.url === `/v1_1/${cloud}/image/upload` && file) {
        const publicId = params['folder'] ? `${params['folder']}/${params['public_id']}` : params['public_id']!;
        uploads.set(publicId, { publicId, params, file });
        const meta = await sharp(file).metadata();
        return reply(200, { public_id: publicId, width: meta.width, height: meta.height, bytes: file.length, format: meta.format });
      }
      if (req.url === `/v1_1/${cloud}/image/destroy`) {
        const found = uploads.delete(params['public_id'] ?? '');
        destroyed.push(params['public_id'] ?? '');
        return reply(200, { result: found ? 'ok' : 'not found' });
      }
      reply(404, { error: { message: 'Not found' } });
    })();
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const apiUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  return {
    cloud,
    apiKey,
    apiSecret,
    url: `cloudinary://${apiKey}:${apiSecret}@${cloud}`,
    apiUrl,
    uploads,
    destroyed,
    get badSignatures() {
      return state.badSignatures;
    },
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

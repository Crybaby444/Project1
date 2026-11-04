import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { createServer, type AddressInfo, type Socket } from 'node:net';
import { describe, expect, it } from 'vitest';
import { loadEnv } from '../src/config/env';
import lv from '../src/mail/i18n/lv.json';
import { MailService } from '../src/mail/mail.service';
import { SmtpMailProvider } from '../src/mail/smtp-mail.provider';
import { mailbox } from './support/mailbox';

const env = loadEnv(process.env);

describe('SMTP delivery (Mailpit)', () => {
  it('delivers a rendered email that arrives with sender, subject, HTML and text', async () => {
    const to = `smtp-${randomUUID()}@yoyo.test`;
    const link = `https://yoyo.test/lv/verify-email?token=${randomUUID()}`;
    const mail = new MailService(new SmtpMailProvider(env.SMTP_URL!, 'Yoyo <no-reply@yoyo.local>'));

    await mail.sendVerifyEmail({ email: to, name: 'Anna', locale: 'lv' }, link);

    const caught = await mailbox.latestTo(to);
    expect(caught.from).toBe('no-reply@yoyo.local');
    expect(caught.to).toEqual([to]);
    expect(caught.subject).toBe(lv.verifyEmail.subject);
    expect(caught.html).toContain(link);
    expect(caught.text).toContain(link);
  });

  it('gives up on a mail server that never answers instead of hanging', async () => {
    const sockets: Socket[] = [];
    const silent = createServer((socket) => void sockets.push(socket));
    await new Promise<void>((resolve) => silent.listen(0, '127.0.0.1', resolve));
    const { port } = silent.address() as AddressInfo;
    const provider = new SmtpMailProvider(`smtp://127.0.0.1:${port}`, 'Yoyo <no-reply@yoyo.local>', {
      timeoutMs: 300,
    });

    const started = Date.now();
    await expect(
      provider.send({ template: 'verify-email', to: 'a@b.lv', subject: 's', html: '<p>h</p>', text: 't' }),
    ).rejects.toThrow();
    expect(Date.now() - started).toBeLessThan(3000);

    sockets.forEach((socket) => socket.destroy());
    silent.close();
  }, 10_000);
});

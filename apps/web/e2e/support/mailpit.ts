/**
 * Reads the mail the API sent, from Mailpit's HTTP API (locally `brew services start mailpit`,
 * in CI a service container). Only for e2e tests.
 */
const MAILPIT = process.env['MAILPIT_URL'] ?? 'http://localhost:8025/api/v1';

export type Mail = { subject: string; text: string; html: string };

type Summary = { ID: string; Subject: string; Created: string };

async function json<T>(path: string): Promise<T> {
  const res = await fetch(`${MAILPIT}${path}`);
  if (!res.ok) throw new Error(`Mailpit ${path}: ${res.status}`);
  return (await res.json()) as T;
}

/**
 * The newest message to `email` (that `matches`, if given), waiting up to 15 s for it: the API
 * sends mail in the background, after it has answered.
 */
export async function latestTo(email: string, matches: (mail: Mail) => boolean = () => true): Promise<Mail> {
  const deadline = Date.now() + 15_000;
  for (;;) {
    const { messages } = await json<{ messages: Summary[] }>(
      `/search?query=${encodeURIComponent(`to:"${email}"`)}&limit=20`,
    );
    for (const summary of messages) {
      const full = await json<{ Subject: string; Text: string; HTML: string }>(`/message/${summary.ID}`);
      const mail = { subject: full.Subject, text: full.Text, html: full.HTML };
      if (matches(mail)) return mail;
    }
    if (Date.now() > deadline) throw new Error(`no matching mail to ${email} in Mailpit`);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

/** The site path (with its query) of the first link in `mail` that contains `pathPart`. */
export function linkFrom(mail: Mail, pathPart: string): string {
  const links = [
    ...mail.text.matchAll(/https?:\/\/[^\s<>"')\]]+/g),
    ...mail.html.matchAll(/href="([^"]+)"/g),
  ].map((match) => (match[1] ?? match[0]).replace(/&amp;/g, '&'));
  const link = links.find((href) => href.includes(pathPart));
  if (!link) throw new Error(`no ${pathPart} link in "${mail.subject}"`);
  const url = new URL(link);
  return `${url.pathname}${url.search}`;
}

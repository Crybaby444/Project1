/** Client for the Mailpit API (local mail catcher, also a CI service). */
const API = process.env['MAILPIT_API_URL'] ?? 'http://localhost:8025/api/v1';

export interface CaughtMail {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
}

interface MailpitAddress {
  Address: string;
}

interface MailpitMessage {
  ID: string;
  From: MailpitAddress;
  To: MailpitAddress[];
  Subject: string;
  HTML: string;
  Text: string;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`Mailpit ${path} answered ${res.status}`);
  return (await res.json()) as T;
}

export const mailbox = {
  /** The newest mail to `address`, waiting up to `timeoutMs` for it to arrive. */
  async latestTo(address: string, timeoutMs = 5000): Promise<CaughtMail> {
    const deadline = Date.now() + timeoutMs;
    const query = encodeURIComponent(`to:"${address}"`);
    for (;;) {
      const found = await getJson<{ messages: { ID: string }[] }>(`/search?query=${query}&limit=1`);
      const id = found.messages[0]?.ID;
      if (id) {
        const message = await getJson<MailpitMessage>(`/message/${id}`);
        return {
          from: message.From.Address,
          to: message.To.map((recipient) => recipient.Address),
          subject: message.Subject,
          html: message.HTML,
          text: message.Text,
        };
      }
      if (Date.now() > deadline) throw new Error(`No mail to ${address} arrived in Mailpit within ${timeoutMs} ms`);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  },
};

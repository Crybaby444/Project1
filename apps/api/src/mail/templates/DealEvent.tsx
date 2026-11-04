import { CallToAction, Fine, Layout, LinkFallback, Paragraph, Title } from './Layout';
import { fill, type MailTexts } from './texts';

export interface DealEventProps {
  t: MailTexts;
  lang: string;
  name: string;
  texts: { preview: string; heading: string; body: string };
  values: Record<string, string>;
  summary: { item: string; dates: string; total: string | null };
  button: string;
  link: string;
}

/** One email for every step of a deal: what happened, what to do next, and the deal at a glance. */
export function DealEvent({ t, lang, name, texts, values, summary, button, link }: DealEventProps) {
  return (
    <Layout lang={lang} preview={fill(texts.preview, values)} footer={t.common.footer}>
      <Title>{fill(texts.heading, values)}</Title>
      <Paragraph>{fill(t.common.greeting, { name })}</Paragraph>
      <Paragraph>{fill(texts.body, values)}</Paragraph>
      <Fine>
        {t.deal.common.item}: {summary.item}
        <br />
        {t.deal.common.dates}: {summary.dates}
        {summary.total !== null && (
          <>
            <br />
            {t.deal.common.total}: {summary.total}
          </>
        )}
      </Fine>
      <CallToAction href={link}>{button}</CallToAction>
      <LinkFallback label={t.common.linkFallback} href={link} />
    </Layout>
  );
}

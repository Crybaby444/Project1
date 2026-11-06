import { CallToAction, Layout, LinkFallback, Paragraph, Title } from './Layout';
import { fill, type MailTexts } from './texts';

/** An administrator filed the listing under another category (mostly out of «Other»). */
export function ListingMoved({
  t,
  lang,
  name,
  title,
  category,
  link,
}: {
  t: MailTexts;
  lang: string;
  name: string;
  title: string;
  category: string;
  link: string;
}) {
  return (
    <Layout lang={lang} preview={t.listingMoved.preview} footer={t.common.footer}>
      <Title>{t.listingMoved.heading}</Title>
      <Paragraph>{fill(t.common.greeting, { name })}</Paragraph>
      <Paragraph>{fill(t.listingMoved.body, { title, category })}</Paragraph>
      <Paragraph>{t.listingMoved.attributes}</Paragraph>
      <CallToAction href={link}>{t.listingMoved.button}</CallToAction>
      <LinkFallback label={t.common.linkFallback} href={link} />
    </Layout>
  );
}

import { CallToAction, Layout, LinkFallback, Paragraph, Title } from './Layout';
import { fill, type MailTexts } from './texts';

export function ListingRejected({
  t,
  lang,
  name,
  title,
  reason,
  link,
}: {
  t: MailTexts;
  lang: string;
  name: string;
  title: string;
  reason: string;
  link: string;
}) {
  return (
    <Layout lang={lang} preview={t.listingRejected.preview} footer={t.common.footer}>
      <Title>{t.listingRejected.heading}</Title>
      <Paragraph>{fill(t.common.greeting, { name })}</Paragraph>
      <Paragraph>{fill(t.listingRejected.body, { title })}</Paragraph>
      <Paragraph>
        <i>{reason}</i>
      </Paragraph>
      <Paragraph>{t.listingRejected.next}</Paragraph>
      <CallToAction href={link}>{t.listingRejected.button}</CallToAction>
      <LinkFallback label={t.common.linkFallback} href={link} />
    </Layout>
  );
}

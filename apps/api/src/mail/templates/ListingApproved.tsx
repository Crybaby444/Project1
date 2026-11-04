import { CallToAction, Layout, LinkFallback, Paragraph, Title } from './Layout';
import { fill, type MailTexts } from './texts';

export function ListingApproved({ t, lang, name, title, link }: { t: MailTexts; lang: string; name: string; title: string; link: string }) {
  return (
    <Layout lang={lang} preview={t.listingApproved.preview} footer={t.common.footer}>
      <Title>{t.listingApproved.heading}</Title>
      <Paragraph>{fill(t.common.greeting, { name })}</Paragraph>
      <Paragraph>{fill(t.listingApproved.body, { title })}</Paragraph>
      <CallToAction href={link}>{t.listingApproved.button}</CallToAction>
      <LinkFallback label={t.common.linkFallback} href={link} />
    </Layout>
  );
}

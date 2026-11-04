import { CallToAction, Fine, Layout, LinkFallback, Paragraph, Title } from './Layout';
import { fill, type MailTexts } from './texts';

export function VerifyEmail({ t, lang, name, link }: { t: MailTexts; lang: string; name: string; link: string }) {
  return (
    <Layout lang={lang} preview={t.verifyEmail.preview} footer={t.common.footer}>
      <Title>{t.verifyEmail.heading}</Title>
      <Paragraph>{fill(t.common.greeting, { name })}</Paragraph>
      <Paragraph>{t.verifyEmail.body}</Paragraph>
      <CallToAction href={link}>{t.verifyEmail.button}</CallToAction>
      <Fine>{t.verifyEmail.expiry}</Fine>
      <LinkFallback label={t.common.linkFallback} href={link} />
      <Fine>{t.verifyEmail.ignore}</Fine>
    </Layout>
  );
}

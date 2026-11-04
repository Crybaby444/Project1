import { CallToAction, Fine, Layout, LinkFallback, Paragraph, Title } from './Layout';
import { fill, type MailTexts } from './texts';

export function ResetPassword({ t, lang, name, link }: { t: MailTexts; lang: string; name: string; link: string }) {
  return (
    <Layout lang={lang} preview={t.resetPassword.preview} footer={t.common.footer}>
      <Title>{t.resetPassword.heading}</Title>
      <Paragraph>{fill(t.common.greeting, { name })}</Paragraph>
      <Paragraph>{t.resetPassword.body}</Paragraph>
      <CallToAction href={link}>{t.resetPassword.button}</CallToAction>
      <Fine>{t.resetPassword.expiry}</Fine>
      <LinkFallback label={t.common.linkFallback} href={link} />
      <Fine>{t.resetPassword.ignore}</Fine>
    </Layout>
  );
}

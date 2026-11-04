import { Code, Fine, Layout, Paragraph, Title } from './Layout';
import { fill, type MailTexts } from './texts';

export function PhoneCode({ t, lang, name, code }: { t: MailTexts; lang: string; name: string; code: string }) {
  return (
    <Layout lang={lang} preview={t.phoneCode.preview} footer={t.common.footer}>
      <Title>{t.phoneCode.heading}</Title>
      <Paragraph>{fill(t.common.greeting, { name })}</Paragraph>
      <Paragraph>{t.phoneCode.body}</Paragraph>
      <Code>{code}</Code>
      <Fine>{t.phoneCode.expiry}</Fine>
      <Fine>{t.phoneCode.ignore}</Fine>
    </Layout>
  );
}

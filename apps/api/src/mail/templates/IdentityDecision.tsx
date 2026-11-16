import { CallToAction, Layout, LinkFallback, Paragraph, Title } from './Layout';
import { fill, type MailTexts } from './texts';

/** A moderator's decision on an identity check (owner, 2026-11-16): confirmed, or new photos needed and why. */
export function IdentityDecision({ t, lang, name, reason, link }: { t: MailTexts; lang: string; name: string; reason: string | null; link: string }) {
  const texts = reason === null ? t.identityVerified : t.identityRejected;
  return (
    <Layout lang={lang} preview={texts.preview} footer={t.common.footer}>
      <Title>{texts.heading}</Title>
      <Paragraph>{fill(t.common.greeting, { name })}</Paragraph>
      <Paragraph>{texts.body}</Paragraph>
      {reason !== null && (
        <>
          <Paragraph>
            <i>{reason}</i>
          </Paragraph>
          <Paragraph>{t.identityRejected.next}</Paragraph>
        </>
      )}
      <CallToAction href={link}>{texts.button}</CallToAction>
      <LinkFallback label={t.common.linkFallback} href={link} />
    </Layout>
  );
}

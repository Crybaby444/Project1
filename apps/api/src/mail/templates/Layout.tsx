import type { ReactNode } from 'react';
import { Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text } from 'react-email';

/** DESIGN.md tokens (light theme; mail clients do not get the dark one). */
const CARBON = '#000000';
const PAPER_WHITE = '#ffffff';
const SKY_WASH = '#dceeff';
const FONT = "Onest, Manrope, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const styles = {
  body: { backgroundColor: SKY_WASH, color: CARBON, fontFamily: FONT, margin: 0, padding: '32px 12px' },
  container: { maxWidth: '520px', margin: '0 auto' },
  wordmark: { fontSize: '28px', fontWeight: 900, letterSpacing: '0.02em', lineHeight: '32px', margin: '0 0 16px' },
  card: {
    backgroundColor: PAPER_WHITE,
    border: `1px solid ${CARBON}`,
    borderRadius: '20px',
    padding: '32px 28px',
  },
  heading: { fontSize: '24px', fontWeight: 700, lineHeight: '30px', margin: '0 0 16px' },
  paragraph: { fontSize: '16px', fontWeight: 500, lineHeight: '24px', margin: '0 0 16px' },
  button: {
    backgroundColor: CARBON,
    border: `1px solid ${CARBON}`,
    borderRadius: '9999px',
    color: PAPER_WHITE,
    display: 'inline-block',
    fontSize: '14px',
    fontWeight: 700,
    letterSpacing: '0.032em',
    padding: '12px 22px',
    textDecoration: 'none',
  },
  fine: { fontSize: '14px', fontWeight: 500, lineHeight: '20px', margin: '16px 0 0' },
  link: { color: CARBON, textDecoration: 'underline', wordBreak: 'break-all' as const },
  code: { fontSize: '32px', fontWeight: 700, letterSpacing: '0.2em', lineHeight: '40px', margin: '8px 0 8px' },
  footer: { fontSize: '14px', fontWeight: 500, lineHeight: '20px', margin: '16px 0 0' },
};

export function Layout(props: { lang: string; preview: string; footer: string; children: ReactNode }) {
  return (
    <Html lang={props.lang}>
      <Head />
      <Preview>{props.preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={styles.wordmark}>YOYO</Text>
          <Section style={styles.card}>{props.children}</Section>
          <Text style={styles.footer}>{props.footer}</Text>
        </Container>
      </Body>
    </Html>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return (
    <Heading as="h1" style={styles.heading}>
      {children}
    </Heading>
  );
}

export function Paragraph({ children }: { children: ReactNode }) {
  return <Text style={styles.paragraph}>{children}</Text>;
}

export function Fine({ children }: { children: ReactNode }) {
  return <Text style={styles.fine}>{children}</Text>;
}

export function CallToAction({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button href={href} style={styles.button}>
      {children}
    </Button>
  );
}

/** The raw link under the button, for clients that block buttons or images. */
export function LinkFallback({ label, href }: { label: string; href: string }) {
  return (
    <Text style={styles.fine}>
      {label}
      <br />
      <Link href={href} style={styles.link}>
        {href}
      </Link>
    </Text>
  );
}

export function Code({ children }: { children: ReactNode }) {
  return <Text style={styles.code}>{children}</Text>;
}

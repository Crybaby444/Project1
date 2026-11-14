import type { ReactNode } from 'react';
import { Head, Html, Preview } from 'react-email';

/*
 * Every Yoyo email in light and dark (DESIGN.md "Project adaptations" §2). Mail clients differ a lot:
 *
 * - Apple Mail (iOS, macOS) honours `color-scheme` and the `prefers-color-scheme: dark` block below,
 *   so it shows our own dark colours instead of recolouring the email by guesswork. Without them it
 *   recoloured the button of the Russian reset email into an empty pill (its label had no colour of
 *   its own and inherited one iOS had rewritten).
 * - Gmail inverts colours itself (fully on iOS, only light ones on Android): every colour pair is
 *   chosen to stay readable either way (mail-buttons.test.ts checks it).
 * - Outlook.com marks the colours it rewrote with [data-ogsc] / [data-ogsb]: we pin the button there.
 * - Outlook for Windows ignores rounded corners and padding on links: it gets a VML pill instead.
 *
 * So every element sets its own colours inline (nothing relies on an inherited colour) and has a class
 * that the dark block overrides with !important.
 */

/** The v16 palette (DESIGN.md): cream paper, night ink, in light and dark. Black and white only. */
const LIGHT = { canvas: '#f4f1e6', surface: '#faf8f1', ink: '#0a0b0e', line: '#d8d4c7', ctaBg: '#0a0b0e', ctaFg: '#f4f1e6' };
const DARK = { canvas: '#0a0b0e', surface: '#121419', ink: '#f4f1e6', line: '#2a2c31', ctaBg: '#f4f1e6', ctaFg: '#0a0b0e' };

const FONT =
  "Onest, Manrope, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
/** The display face of the site (Sofia Sans Extra Condensed), then condensed heavy system faces that cover Latvian and Cyrillic. */
const DISPLAY_FONT =
  "'Sofia Sans Extra Condensed', 'Arial Narrow', 'Helvetica Neue Condensed Black', 'Roboto Condensed', Impact, 'Arial Black', sans-serif";

const CSS = `
:root { color-scheme: light dark; supported-color-schemes: light dark; }
body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; }
.yoyo-cta:hover { opacity: 0.88; }
@media (max-width: 480px) {
  .yoyo-card-cell { padding: 24px 18px !important; }
  .yoyo-cta { padding: 13px 20px !important; }
}
@media (prefers-color-scheme: dark) {
  .yoyo-body, .yoyo-canvas { background-color: ${DARK.canvas} !important; color: ${DARK.ink} !important; }
  .yoyo-card { background-color: ${DARK.surface} !important; border-color: ${DARK.line} !important; }
  .yoyo-text, .yoyo-link { color: ${DARK.ink} !important; }
  .yoyo-cta-cell { background-color: ${DARK.ctaBg} !important; border-color: ${DARK.ctaBg} !important; }
  .yoyo-cta { background-color: ${DARK.ctaBg} !important; color: ${DARK.ctaFg} !important; }
  .yoyo-cta-label { color: ${DARK.ctaFg} !important; }
}
[data-ogsb] .yoyo-cta-cell, [data-ogsb] .yoyo-cta { background-color: ${DARK.ctaBg} !important; border-color: ${DARK.ctaBg} !important; }
[data-ogsc] .yoyo-cta, [data-ogsc] .yoyo-cta-label { color: ${DARK.ctaFg} !important; }
`;

/** `bgcolor` (old HTML, still read by mail clients that drop CSS backgrounds) is not in React's types. */
const bgcolor = (color: string) => ({ bgcolor: color }) as Record<string, string>;

const text = { color: LIGHT.ink, fontFamily: FONT, margin: 0 } as const;

const styles = {
  body: { backgroundColor: LIGHT.canvas, color: LIGHT.ink, margin: 0, padding: 0 },
  canvas: { backgroundColor: LIGHT.canvas, color: LIGHT.ink, padding: '32px 12px' },
  wordmark: {
    ...text,
    fontFamily: DISPLAY_FONT,
    fontSize: '26px',
    fontWeight: 900,
    letterSpacing: '0.01em',
    lineHeight: '28px',
    margin: '0 0 18px',
  },
  card: {
    backgroundColor: LIGHT.surface,
    border: `1px solid ${LIGHT.line}`,
    borderRadius: '14px',
    borderCollapse: 'separate' as const,
  },
  cardCell: { padding: '32px 28px' },
  heading: {
    ...text,
    fontFamily: DISPLAY_FONT,
    fontSize: '38px',
    fontWeight: 900,
    lineHeight: '38px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0',
    margin: '0 0 20px',
  },
  paragraph: { ...text, fontSize: '16px', fontWeight: 500, lineHeight: '24px', margin: '0 0 16px' },
  fine: { ...text, fontSize: '14px', fontWeight: 500, lineHeight: '20px', margin: '16px 0 0' },
  link: { color: LIGHT.ink, textDecoration: 'underline', wordBreak: 'break-all' as const },
  code: {
    ...text,
    fontSize: '32px',
    fontWeight: 700,
    letterSpacing: '0.2em',
    lineHeight: '40px',
    margin: '8px 0',
  },
  footer: { ...text, fontSize: '14px', fontWeight: 500, lineHeight: '20px', margin: '16px 0 0' },
};

export function Layout(props: { lang: string; preview: string; footer: string; children: ReactNode }) {
  return (
    <Html lang={props.lang}>
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <style>{CSS}</style>
      </Head>
      <Preview>{props.preview}</Preview>
      <body className="yoyo-body" style={styles.body}>
        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} border={0}>
          <tbody>
            <tr>
              <td className="yoyo-canvas" {...bgcolor(LIGHT.canvas)} align="center" style={styles.canvas}>
                <table
                  role="presentation"
                  width="100%"
                  cellPadding={0}
                  cellSpacing={0}
                  border={0}
                  style={{ maxWidth: '520px', margin: '0 auto' }}
                >
                  <tbody>
                    <tr>
                      <td align="left">
                        <p className="yoyo-text" style={styles.wordmark}>
                          <span aria-hidden="true">● </span>YOYO
                        </p>
                        <table
                          role="presentation"
                          width="100%"
                          cellPadding={0}
                          cellSpacing={0}
                          border={0}
                          className="yoyo-card"
                          {...bgcolor(LIGHT.surface)}
                          style={styles.card}
                        >
                          <tbody>
                            <tr>
                              <td className="yoyo-card-cell" style={styles.cardCell}>
                                {props.children}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <p className="yoyo-text" style={styles.footer}>
                          {props.footer}
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </Html>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return (
    <h1 className="yoyo-text" style={styles.heading}>
      {children}
    </h1>
  );
}

export function Paragraph({ children }: { children: ReactNode }) {
  return (
    <p className="yoyo-text" style={styles.paragraph}>
      {children}
    </p>
  );
}

export function Fine({ children }: { children: ReactNode }) {
  return (
    <p className="yoyo-text" style={styles.fine}>
      {children}
    </p>
  );
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Button height and a width wide enough for the label, for the Outlook pill (VML needs a fixed size). */
const BUTTON_HEIGHT = 46;
const outlookWidth = (label: string) => Math.min(460, Math.max(180, Math.round(label.length * 9.5) + 56));

/**
 * The bulletproof button. A table cell and the link inside it both carry the pill colours (some clients
 * paint only one of them), the label has its own colour, and Outlook for Windows gets a VML pill.
 * Built as markup because React cannot write the conditional comments Outlook reads.
 */
export function CallToAction({ href, children }: { href: string; children: string }) {
  const url = escapeHtml(href);
  const label = escapeHtml(children);
  const pill = `border-radius:9999px;`;
  const html =
    `<!--[if mso]>` +
    `<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" ` +
    `style="height:${BUTTON_HEIGHT}px;v-text-anchor:middle;width:${outlookWidth(children)}px;" arcsize="50%" ` +
    `strokecolor="${LIGHT.ink}" strokeweight="1px" fillcolor="${LIGHT.ctaBg}">` +
    `<w:anchorlock/><center style="color:${LIGHT.ctaFg};font-family:'Arial Black',Arial,sans-serif;font-size:14px;font-weight:bold;letter-spacing:0.6px;text-transform:uppercase;">${label}</center>` +
    `</v:roundrect>` +
    `<![endif]-->` +
    `<!--[if !mso]><!-->` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;margin:8px 0 0;">` +
    `<tr><td class="yoyo-cta-cell" bgcolor="${LIGHT.ctaBg}" align="center" ` +
    `style="background-color:${LIGHT.ctaBg};border:1px solid ${LIGHT.ink};${pill}">` +
    `<a class="yoyo-cta" href="${url}" target="_blank" rel="noopener" ` +
    `style="background-color:${LIGHT.ctaBg};color:${LIGHT.ctaFg};display:inline-block;${pill}` +
    `font-family:${DISPLAY_FONT};font-size:14px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;` +
    `line-height:20px;padding:13px 24px;text-align:center;text-decoration:none;-webkit-text-size-adjust:none;">` +
    `<span class="yoyo-cta-label" style="color:${LIGHT.ctaFg};text-decoration:none;">${label}</span>` +
    `</a></td></tr></table>` +
    `<!--<![endif]-->`;
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

/** The raw link under the button, for clients that block buttons or images. */
export function LinkFallback({ label, href }: { label: string; href: string }) {
  return (
    <p className="yoyo-text" style={styles.fine}>
      {label}
      <br />
      <a className="yoyo-link" href={href} target="_blank" rel="noopener" style={styles.link}>
        {href}
      </a>
    </p>
  );
}

export function Code({ children }: { children: ReactNode }) {
  return (
    <p className="yoyo-text" style={styles.code}>
      {children}
    </p>
  );
}

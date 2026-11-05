import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ApiStatus } from '@/components/ApiStatus';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { LogoMark } from '@/components/ui/LogoMark';
import { Marquee } from '@/components/ui/Marquee';
import { Wordmark } from '@/components/ui/Wordmark';
import { displayFit } from '@/lib/display-fit';
import { MotionDemos } from './MotionDemos';
import { Section, StyleguideDemos } from './StyleguideDemos';

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Design token names are identifiers, shown as-is in every language.
const SURFACES = [
  ['Canvas', '--canvas'],
  ['Surface', '--surface'],
  ['Band', '--band'],
  ['Mist', '--mist'],
  ['Ink', '--ink'],
  ['CTA', '--cta-bg'],
] as const;

const STICKER_SWATCHES = [
  ['Electric Blue', '--sticker-blue', '#4da2ff'],
  ['Mint Pop', '--sticker-mint', '#55db9c'],
  ['Lavender', '--sticker-lavender', '#e9ccff'],
  ['Ember', '--sticker-ember', '#fb4903'],
  ['Sunburst', '--sticker-sun', '#ffd731'],
  ['Voltage Violet', '--sticker-violet', '#5c4ade'],
] as const;

// Glyph-coverage samples: each line is in its own language on purpose.
const SAMPLES = [
  ['en', 'The quick brown fox rents a drill for the weekend.'],
  ['lv', 'Ģimenē ķīmiķis spēlē ģitāru; žēl, ka ļoti ņirgājās lāču čempions šūpolēs.'],
  ['ru', 'Съешь же ещё этих мягких французских булок, да выпей чаю.'],
] as const;

function Swatch({ name, token, hex }: { name: string; token: string; hex?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden="true" className="size-12 shrink-0 rounded-card border border-ink" style={{ background: `var(${token})` }} />
      <span className="flex flex-col">
        <span className="font-bold">{name}</span>
        <span className="text-sm">{hex ? `${token} · ${hex}` : token}</span>
      </span>
    </div>
  );
}

export default async function StyleguidePage({ params }: { params: Promise<{ locale: string }> }) {
  if (process.env.NEXT_PUBLIC_SHOW_STYLEGUIDE !== 'true') notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('styleguide');

  return (
    <main className="mx-auto flex max-w-[1440px] flex-col gap-14 px-4 pt-12 pb-16 sm:px-8">
      <header className="@container flex flex-col items-start gap-5">
        <LogoMark size={48} />
        <h1
          style={displayFit(t('title'), { max: '5rem' })}
          className="font-display text-display-fit leading-[0.85] font-black uppercase"
        >
          {t('title')}
        </h1>
        <p className="max-w-[60ch] text-lg leading-relaxed">{t('intro')}</p>
        <ApiStatus />
      </header>

      <Section title={t('colors')}>
        <h3 className="text-2xl font-bold">{t('surfaces')}</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SURFACES.map(([name, token]) => (
            <Swatch key={token} name={name} token={token} />
          ))}
        </div>
        <h3 className="text-2xl font-bold">{t('stickers')}</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STICKER_SWATCHES.map(([name, token, hex]) => (
            <Swatch key={token} name={name} token={token} hex={hex} />
          ))}
        </div>
      </Section>

      <Section title={t('typography')}>
        <div className="flex flex-col gap-6">
          <div>
            <p className="text-xs font-bold tracking-[0.032em] uppercase">{t('display')}</p>
            <p className="text-[clamp(4rem,18vw,12.5rem)]">
              <Wordmark />
            </p>
          </div>
          <div>
            <p className="text-xs font-bold tracking-[0.032em] uppercase">{t('heading')} · 64 / 30 / 24</p>
            <p className="text-[clamp(2.5rem,8vw,4rem)] leading-none font-bold">{t('headingSample')}</p>
            <p className="mt-2 text-[30px] leading-tight font-bold">{t('headingSample')}</p>
            <p className="mt-1 text-2xl leading-tight font-bold">{t('headingSample')}</p>
          </div>
          <div>
            <p className="text-xs font-bold tracking-[0.032em] uppercase">{t('body')} · 16 / 15</p>
            <p className="max-w-[60ch] text-base leading-relaxed">{t('cardStaticBody')}</p>
            <p className="max-w-[60ch] text-[15px] leading-relaxed">{t('cardInteractiveBody')}</p>
          </div>
          <div>
            <p className="text-xs font-bold tracking-[0.032em] uppercase">{t('caption')} · 12</p>
            <p className="text-xs font-bold tracking-[0.032em] uppercase">{t('marqueeItem4')}</p>
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-xs font-bold tracking-[0.032em] uppercase">{t('languages')}</p>
            {SAMPLES.map(([lang, text]) => (
              <div key={lang} lang={lang} className="flex flex-col gap-1">
                <p className="font-display text-2xl leading-tight font-black">{text}</p>
                <p className="text-base">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <StyleguideDemos />

      <MotionDemos />

      <Section title={t('marquee')}>
        <div className="-mx-4 sm:-mx-8">
          <Marquee items={[t('marqueeItem1'), t('marqueeItem2'), t('marqueeItem3'), t('marqueeItem4')]} />
        </div>
      </Section>

      <Section title={t('language')}>
        <div className="flex">
          <LanguageSwitcher />
        </div>
      </Section>
    </main>
  );
}

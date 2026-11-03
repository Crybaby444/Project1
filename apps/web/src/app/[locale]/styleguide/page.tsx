import { STATUS_TONES } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { use, type ReactNode } from 'react';
import { ApiStatusPill } from '@/components/ApiStatusPill';
import { SiteHeader } from '@/components/SiteHeader';
import { ButtonDemo } from '@/components/styleguide/ButtonDemo';
import { ChipDemo } from '@/components/styleguide/ChipDemo';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Marquee } from '@/components/ui/Marquee';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Sticker, type StickerKind } from '@/components/ui/Sticker';
import { Wordmark } from '@/components/ui/Wordmark';

export const metadata = { robots: { index: false, follow: false } };

const THEMED_SWATCHES = [
  { token: '--canvas', name: 'Canvas' },
  { token: '--surface', name: 'Surface' },
  { token: '--band', name: 'Band' },
  { token: '--mist', name: 'Mist' },
  { token: '--ink', name: 'Ink' },
  { token: '--cta-bg', name: 'CTA' },
] as const;

const STICKER_SWATCHES = [
  { token: '--sticker-blue', name: 'Electric Blue', hex: '#4da2ff' },
  { token: '--sticker-mint', name: 'Mint Pop', hex: '#55db9c' },
  { token: '--sticker-lavender', name: 'Lavender', hex: '#e9ccff' },
  { token: '--sticker-ember', name: 'Ember', hex: '#fb4903' },
  { token: '--sticker-sun', name: 'Sunburst', hex: '#ffd731' },
  { token: '--sticker-violet', name: 'Voltage Violet', hex: '#5c4ade' },
] as const;

/** Content samples (not UI copy): each shown in its own language with all special letters. */
const LANGUAGE_SAMPLES = [
  { lang: 'en', text: 'The quick brown fox rents a jet ski from the lazy dog next door.' },
  {
    lang: 'lv',
    text: 'Ģimene ātri nomāja ģitāru, čemodānu, ēveli un ķerru; ļoti mīļš suns ņurdēja, bet šūpuļkrēslā žāvājās kaķis.',
  },
  { lang: 'ru', text: 'Съешь же ещё этих мягких французских булок, да выпей чаю.' },
] as const;

const STICKERS: { kind: StickerKind; rotate: number }[] = [
  { kind: 'coin', rotate: -8 },
  { kind: 'check', rotate: 6 },
  { kind: 'bolt', rotate: -4 },
  { kind: 'star', rotate: 10 },
  { kind: 'yoyo', rotate: -12 },
];

const STATUS_ICON = (
  <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
    <circle cx="8" cy="8" r="3.5" />
  </svg>
);

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-5 border-t border-ink pt-8">
      <h2 className="text-[clamp(24px,4vw,30px)] leading-[1.1] font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Swatch({ token, name, hex }: { token: string; name: string; hex?: string }) {
  return (
    <li className="flex flex-col gap-2">
      <span
        className="block h-20 rounded-card border border-ink"
        style={{ backgroundColor: `var(${token})` }}
      />
      <span className="text-[14px] leading-tight font-bold">{name}</span>
      <code className="text-[14px] leading-tight">{hex ?? token}</code>
    </li>
  );
}

export default function StyleguidePage({ params }: { params: Promise<{ locale: string }> }) {
  if (process.env.NEXT_PUBLIC_SHOW_STYLEGUIDE !== 'true') notFound();

  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations('styleguide');

  return (
    <>
      <Marquee items={[t('marquee1'), t('marquee2'), t('marquee3'), t('marquee4')]} />
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-12 px-4 pt-6 pb-24 sm:px-8">
        <header className="flex flex-col gap-4">
          <h1 className="font-display text-[clamp(40px,10vw,120px)] leading-[0.85] font-extrabold break-words">
            {t('title')}
          </h1>
          <p className="max-w-[60ch] text-[17px]">{t('lead')}</p>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[14px] font-bold">{t('api')}:</span>
            <ApiStatusPill />
          </div>
        </header>

        <Section title={t('colors')}>
          <h3 className="text-[15px] font-bold">{t('surfaces')}</h3>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {THEMED_SWATCHES.map((swatch) => (
              <Swatch key={swatch.token} {...swatch} />
            ))}
          </ul>
          <h3 className="text-[15px] font-bold">{t('stickers')}</h3>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {STICKER_SWATCHES.map((swatch) => (
              <Swatch key={swatch.token} {...swatch} />
            ))}
          </ul>
        </Section>

        <Section title={t('typography')}>
          <div className="flex flex-col gap-2">
            <span className="text-[14px] font-bold">{t('display')}</span>
            <span className="block text-[clamp(72px,18vw,200px)] leading-[0.8]">
              <Wordmark />
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[14px] font-bold">{t('heading')}</span>
            <p className="text-[clamp(30px,6vw,64px)] leading-none font-bold">{t('cardTitle')}</p>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[14px] font-bold">{t('body')}</span>
            <p className="max-w-[60ch] text-[16px]">{t('cardInteractive')}</p>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-[14px] font-bold">{t('samples')}</span>
            {LANGUAGE_SAMPLES.map(({ lang, text }) => (
              <figure key={lang} className="flex flex-col gap-1">
                <figcaption className="text-[14px] font-bold uppercase">{lang}</figcaption>
                <p lang={lang} className="font-display text-[clamp(20px,3vw,32px)] leading-[1.1]">
                  {text}
                </p>
                <p lang={lang} className="text-[16px]">
                  {text}
                </p>
              </figure>
            ))}
          </div>
        </Section>

        <Section title={t('components')}>
          <h3 className="text-[15px] font-bold">{t('buttons')}</h3>
          <ButtonDemo />

          <h3 className="text-[15px] font-bold">{t('chips')}</h3>
          <ChipDemo />

          <h3 className="text-[15px] font-bold">{t('cards')}</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <p className="text-[18px] font-bold">{t('cardTitle')}</p>
              <p className="text-[14px]">{t('cardBody')}</p>
            </Card>
            <Card interactive>
              <p className="text-[15px]">{t('cardInteractive')}</p>
            </Card>
            <Card elevated className="bg-sticker-lavender text-black">
              <p className="text-[15px]">{t('cardElevated')}</p>
            </Card>
          </div>

          <h3 className="text-[15px] font-bold">{t('fields')}</h3>
          <form className="grid max-w-3xl gap-4 md:grid-cols-2" noValidate>
            <Field label={t('emailLabel')} hint={t('emailHint')}>
              <input type="email" name="email" autoComplete="email" />
            </Field>
            <Field label={t('phoneLabel')} error={t('phoneError')}>
              <input type="tel" name="phone" autoComplete="tel" defaultValue="2000" />
            </Field>
          </form>

          <h3 className="text-[15px] font-bold">{t('statuses')}</h3>
          <div className="flex flex-wrap gap-2">
            {STATUS_TONES.map((tone) => (
              <StatusBadge key={tone} tone={tone} icon={STATUS_ICON}>
                {t(`status.${tone}`)}
              </StatusBadge>
            ))}
          </div>

          <h3 className="text-[15px] font-bold">{t('stickersTitle')}</h3>
          <p className="text-[14px]">{t('stickerHint')}</p>
          <div className="flex flex-wrap items-center gap-6 rounded-card border border-ink bg-band p-6">
            {STICKERS.map(({ kind, rotate }) => (
              <Sticker
                key={kind}
                kind={kind}
                rotate={rotate}
                label={kind === 'check' ? t('stickerVerified') : undefined}
              />
            ))}
          </div>

          <h3 className="text-[15px] font-bold">{t('marquee')}</h3>
          <div className="-mx-4 sm:-mx-8">
            <Marquee items={[t('marquee1'), t('marquee2'), t('marquee3'), t('marquee4')]} />
          </div>
        </Section>
      </main>
    </>
  );
}

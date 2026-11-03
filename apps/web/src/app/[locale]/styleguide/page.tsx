import { LOCALES, STATUS_TONES } from '@yoyo/shared';
import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { type ReactNode, use } from 'react';
import { ApiStatusPill } from '@/components/ApiStatusPill';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { IconButton } from '@/components/ui/IconButton';
import { Marquee } from '@/components/ui/Marquee';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Sticker } from '@/components/ui/Sticker';
import { ChipDemo } from './ChipDemo';
import { StatusIcon } from './StatusIcon';

export const metadata: Metadata = { robots: { index: false, follow: false } };

const SURFACES = ['--canvas', '--surface', '--band', '--mist', '--ink'] as const;
const STICKERS = ['--sticker-blue', '--sticker-mint', '--sticker-lavender', '--sticker-ember', '--sticker-sun', '--sticker-violet'] as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-ink pt-6">
      <h2 className="text-[24px] leading-[1.2] font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Swatch({ token }: { token: string }) {
  return (
    <li className="flex min-w-0 items-center gap-3 rounded-card border border-ink bg-surface p-2 pr-4">
      <span aria-hidden="true" className="size-10 shrink-0 rounded-full border border-ink" style={{ background: `var(${token})` }} />
      <code className="truncate text-[14px]">{token}</code>
    </li>
  );
}

export default function StyleguidePage({ params }: { params: Promise<{ locale: string }> }) {
  if (process.env.NEXT_PUBLIC_SHOW_STYLEGUIDE !== 'true') notFound();
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations('styleguide');
  const ts = useTranslations('status');

  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-10 px-4 pt-10 pb-20 sm:px-8">
      <header className="flex flex-col items-start gap-4">
        <h1 className="font-display text-[clamp(40px,9vw,110px)] leading-[0.85] font-extrabold break-words uppercase">
          {t('title')}
        </h1>
        <p className="max-w-[60ch] text-ink-muted">{t('intro')}</p>
        <ApiStatusPill />
      </header>

      <Section title={t('colors')}>
        <h3 className="text-[14px] font-bold">{t('surfaces')}</h3>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {SURFACES.map((token) => (
            <Swatch key={token} token={token} />
          ))}
        </ul>
        <h3 className="text-[14px] font-bold">{t('stickerPalette')}</h3>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {STICKERS.map((token) => (
            <Swatch key={token} token={token} />
          ))}
        </ul>
      </Section>

      <Section title={t('typography')}>
        <p className="text-[14px] font-bold">{t('display')}</p>
        <p className="font-display text-[clamp(56px,14vw,200px)] leading-[0.8] font-extrabold break-words">YOYO</p>
        <p className="text-[14px] font-bold">{t('body')}</p>
        <ul className="flex flex-col gap-3">
          {LOCALES.map((sampleLocale) => (
            <li key={sampleLocale} lang={sampleLocale} className="flex flex-col gap-1">
              <span className="font-display text-[clamp(22px,4vw,40px)] leading-[1] font-extrabold">
                {t(`samples.${sampleLocale}`)}
              </span>
              <span className="text-[15px]">{t(`samples.${sampleLocale}`)}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={t('buttons')}>
        <div className="flex flex-wrap items-center gap-3">
          <Button>{t('primary')}</Button>
          <Button variant="ghost">{t('ghost')}</Button>
          <Button size="lg">{t('large')}</Button>
          <Button loading>{t('loading')}</Button>
          <Button variant="ghost" disabled>
            {t('disabled')}
          </Button>
          <Button href="/" variant="ghost">
            {t('link')}
          </Button>
        </div>
        <h3 className="text-[14px] font-bold">{t('iconButtons')}</h3>
        <div className="flex items-center gap-3">
          <IconButton label={t('favourite')}>
            <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="var(--sticker-ember)" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20Z" />
            </svg>
          </IconButton>
          <IconButton label={t('share')}>
            <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
              <path d="M12 15V3M7.5 7.5 12 3l4.5 4.5M5 13v6.5h14V13" />
            </svg>
          </IconButton>
        </div>
      </Section>

      <Section title={t('chips')}>
        <ChipDemo
          labels={[t('chipTools'), t('chipCamping'), t('chipElectronics'), t('chipParty')]}
        />
      </Section>

      <Section title={t('cards')}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card interactive>
            <h3 className="text-[24px] leading-[1.2] font-bold">{t('cardTitle')}</h3>
            <p className="mt-2 text-ink-muted">{t('cardBody')}</p>
          </Card>
          <Card featured color="lavender">
            <p className="text-[15px] font-bold">{t('cardFeatured')}</p>
          </Card>
        </div>
      </Section>

      <Section title={t('fields')}>
        <div className="grid max-w-[720px] grid-cols-1 gap-4 md:grid-cols-2">
          <Field label={t('nameLabel')}>
            <input type="text" autoComplete="name" />
          </Field>
          <Field label={t('emailLabel')} hint={t('emailHint')}>
            <input type="email" autoComplete="email" />
          </Field>
          <Field label={t('emailLabel')} error={t('emailError')}>
            <input type="email" defaultValue="name@" />
          </Field>
        </div>
      </Section>

      <Section title={t('statuses')}>
        <ul className="flex flex-wrap gap-2">
          {STATUS_TONES.map((tone) => (
            <li key={tone}>
              <StatusBadge tone={tone} icon={<StatusIcon tone={tone} />}>
                {ts(tone)}
              </StatusBadge>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={t('stickers')}>
        <p className="text-ink-muted">{t('stickersHint')}</p>
        <div className="flex flex-wrap items-center gap-6">
          <Sticker kind="coin" rotate={-8} />
          <Sticker kind="check" label={t('stickerVerified')} rotate={6} />
          <Sticker kind="bolt" rotate={-4} />
          <Sticker kind="star" rotate={10} />
          <Sticker kind="yoyo" rotate={-12} />
        </div>
      </Section>

      <Section title={t('marquee')}>
        <div className="-mx-4 sm:-mx-8">
          <Marquee
            items={[t('marqueeItems.a'), t('marqueeItems.b'), t('marqueeItems.c'), t('marqueeItems.d')]}
          />
        </div>
      </Section>
    </main>
  );
}

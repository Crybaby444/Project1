'use client';

import { STATUS_TONES, type StickerColor } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/Field';
import { IconButton } from '@/components/ui/IconButton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StatusIcon } from '@/components/ui/StatusIcon';
import { Sticker, type StickerKind } from '@/components/ui/Sticker';

const CATEGORIES: { key: 'electronics' | 'tools' | 'camping' | 'photo' | 'sports' | 'vehicles'; color: StickerColor }[] = [
  { key: 'electronics', color: 'blue' },
  { key: 'tools', color: 'mint' },
  { key: 'camping', color: 'lavender' },
  { key: 'photo', color: 'sun' },
  { key: 'sports', color: 'ember' },
  { key: 'vehicles', color: 'violet' },
];

const STICKERS: StickerKind[] = ['coin', 'check', 'bolt', 'star', 'yoyo'];

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-5">
      <h2 className="border-b border-ink pb-2 text-[30px] leading-tight font-bold">{title}</h2>
      {children}
    </section>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

/** Interactive part of the styleguide: every component in its variants. */
export function StyleguideDemos() {
  const t = useTranslations('styleguide');
  const tStatus = useTranslations('status');
  const [pressed, setPressed] = useState<Set<string>>(() => new Set(['tools']));

  function toggle(key: string, next: boolean) {
    setPressed((current) => {
      const copy = new Set(current);
      if (next) copy.add(key);
      else copy.delete(key);
      return copy;
    });
  }

  return (
    <>
      <Section title={t('buttons')}>
        <div className="flex flex-wrap items-center gap-3">
          <Button>{t('primary')}</Button>
          <Button variant="ghost">{t('ghost')}</Button>
          <Button size="lg">{t('primary')}</Button>
          <Button loading>{t('loading')}</Button>
          <Button disabled>{t('disabled')}</Button>
          <Button variant="ghost" href="/">
            {t('link')}
          </Button>
          <IconButton label={t('iconButton')}>
            <HeartIcon />
          </IconButton>
        </div>
      </Section>

      <Section title={t('chips')}>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(({ key, color }, index) => (
            <Chip
              key={key}
              color={color}
              tilt={index % 2 ? 'right' : 'left'}
              pressed={pressed.has(key)}
              onPressedChange={(next) => toggle(key, next)}
            >
              {t(`categories.${key}`)}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title={t('cards')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="p-6">
            <h3 className="text-2xl font-bold">{t('cardStatic')}</h3>
            <p className="mt-2 leading-relaxed">{t('cardStaticBody')}</p>
          </Card>
          <Card interactive className="p-6">
            <h3 className="text-2xl font-bold">{t('cardInteractive')}</h3>
            <p className="mt-2 leading-relaxed">{t('cardInteractiveBody')}</p>
          </Card>
        </div>
      </Section>

      <Section title={t('fields')}>
        <div className="grid max-w-xl gap-5">
          <Field label={t('fieldEmail')} hint={t('fieldEmailHint')}>
            <input
              type="email"
              autoComplete="email"
              className="min-h-10 rounded-pill border border-ink bg-surface px-4 text-base"
            />
          </Field>
          <Field label={t('fieldPrice')} error={t('fieldPriceError')}>
            <input
              inputMode="decimal"
              defaultValue="0"
              className="min-h-10 rounded-pill border border-ink bg-surface px-4 text-base"
            />
          </Field>
        </div>
      </Section>

      <Section title={t('statuses')}>
        <div className="flex flex-wrap gap-2">
          {STATUS_TONES.map((tone) => (
            <StatusBadge key={tone} tone={tone} icon={<StatusIcon tone={tone} />}>
              {tStatus(tone)}
            </StatusBadge>
          ))}
        </div>
      </Section>

      <Section title={t('stickersTitle')}>
        <p>{t('stickerHint')}</p>
        <div className="flex flex-wrap items-center gap-5">
          {STICKERS.map((kind) => (
            <Sticker key={kind} kind={kind} label={t(`sticker.${kind}`)} size={72} />
          ))}
        </div>
      </Section>
    </>
  );
}

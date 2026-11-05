import { getTranslations } from 'next-intl/server';
import { Card } from '@/components/ui/Card';
import { Sticker, type StickerKind } from '@/components/ui/Sticker';
import { Section, SectionTitle } from './Section';

const POINTS: { key: 'rent' | 'lend' | 'back'; fill: string; sticker: StickerKind; tilt: string }[] = [
  { key: 'rent', fill: 'bg-sticker-sun text-black', sticker: 'tag', tilt: 'lg:-rotate-2' },
  { key: 'lend', fill: 'bg-sticker-mint text-black', sticker: 'coin', tilt: 'lg:translate-y-8 lg:rotate-1' },
  { key: 'back', fill: 'bg-sticker-lavender text-black', sticker: 'yoyo', tilt: 'lg:-rotate-1' },
];

export async function WhatIsYoyo() {
  const t = await getTranslations('landing.what');

  return (
    <Section id="what" tone="surface">
      <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-end">
        <SectionTitle
          id="what"
          eyebrow={t('eyebrow')}
          title={t('title')}
          stickers={[{ kind: 'key', size: 88, top: '-14%', right: '4%', rotate: 16 }]}
        />
        <p className="max-w-[52ch] text-lg leading-relaxed sm:text-xl">{t('lead')}</p>
      </div>
      <ul className="mt-14 grid gap-5 md:grid-cols-3">
        {POINTS.map(({ key, fill, sticker, tilt }) => (
          <li key={key} className={tilt}>
            <Card interactive fill={fill} className="rounded-card-xl relative flex h-full flex-col gap-3 p-7 pt-10">
              <Sticker kind={sticker} size={56} className="absolute -top-6 left-6 -rotate-12" />
              <h3 className="text-[clamp(1.5rem,2.2vw,1.875rem)] leading-tight font-bold text-balance">{t(`${key}.title`)}</h3>
              <p className="text-base leading-relaxed">{t(`${key}.body`)}</p>
            </Card>
          </li>
        ))}
      </ul>
    </Section>
  );
}

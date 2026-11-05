import { getTranslations } from 'next-intl/server';
import { Card } from '@/components/ui/Card';
import { Sticker, type StickerKind } from '@/components/ui/Sticker';
import { Section, SectionTitle } from './Section';

const POINTS: { key: 'deposit' | 'contract' | 'moderation' | 'reviews'; fill: string; sticker: StickerKind }[] = [
  // Lavender is the "deposit frozen" colour of the deal statuses (DESIGN.md Project adaptations §4).
  { key: 'deposit', fill: 'bg-sticker-lavender text-black', sticker: 'coin' },
  { key: 'contract', fill: 'bg-surface text-ink', sticker: 'check' },
  { key: 'moderation', fill: 'bg-surface text-ink', sticker: 'shield' },
  { key: 'reviews', fill: 'bg-sticker-sun text-black', sticker: 'star' },
];

export async function Safety() {
  const t = await getTranslations('landing.safety');

  return (
    <Section id="safety" tone="canvas">
      <SectionTitle
        id="safety"
        eyebrow={t('eyebrow')}
        title={t('title')}
        stickers={[{ kind: 'shield', size: 112, top: '-6%', right: '6%', rotate: 9 }]}
      />
      <ul className="mt-12 grid gap-5 md:grid-cols-2">
        {POINTS.map(({ key, fill, sticker }, index) => (
          <li key={key} className={index % 2 ? 'md:translate-y-6' : ''}>
            <Card interactive fill={fill} className="rounded-card-xl flex h-full gap-5 p-6 sm:p-8">
              <Sticker kind={sticker} size={64} className="shrink-0 -rotate-6" />
              <div className="flex flex-col gap-2">
                <h3 className="text-2xl leading-tight font-bold text-balance">{t(`${key}.title`)}</h3>
                <p className="text-base leading-relaxed">{t(`${key}.body`)}</p>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </Section>
  );
}

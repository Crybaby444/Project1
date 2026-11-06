import { getTranslations } from 'next-intl/server';
import { Tilt } from '@/components/motion/Tilt';
import { Sticker, type StickerKind } from '@/components/ui/Sticker';
import { Section, SectionTitle } from './Section';

const POINTS: {
  key: 'deposit' | 'contract' | 'moderation' | 'reviews';
  fill: string;
  sticker: StickerKind;
}[] = [
  // Lavender is the "deposit frozen" colour of the deal statuses (DESIGN.md Project adaptations §4).
  { key: 'deposit', fill: 'bg-sticker-lavender text-black', sticker: 'coin' },
  { key: 'contract', fill: 'bg-surface text-ink', sticker: 'check' },
  { key: 'moderation', fill: 'bg-surface text-ink', sticker: 'shield' },
  { key: 'reviews', fill: 'bg-sticker-sun text-black', sticker: 'star' },
];

export async function Safety() {
  const t = await getTranslations('landing.safety');

  return (
    <Section id="safety" tone="sun">
      <SectionTitle
        id="safety"
        eyebrow={t('eyebrow')}
        title={t('title')}
        stickers={[{ kind: 'shield', size: 112, top: '-6%', right: '6%', rotate: 9 }]}
      />
      <ul className="mt-12 grid gap-5 md:grid-cols-2">
        {POINTS.map(({ key, fill, sticker }, index) => (
          <li key={key} className={index % 2 ? 'md:translate-y-6' : ''}>
            <Tilt radius="rounded-card-xl" className={`flex h-full gap-5 p-6 sm:p-8 ${fill}`}>
              <span data-bounce="" className="shrink-0 self-start">
                <Sticker kind={sticker} size={64} className="-rotate-6" />
              </span>
              <div className="flex flex-col gap-2">
                <h3 className="text-2xl leading-tight font-bold text-balance">{t(`${key}.title`)}</h3>
                <p className="text-base leading-relaxed">{t(`${key}.body`)}</p>
              </div>
            </Tilt>
          </li>
        ))}
      </ul>
    </Section>
  );
}

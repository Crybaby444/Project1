'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { CountUp } from '@/components/motion/CountUp';
import { Marquee } from '@/components/motion/Marquee';
import { Bob, Parallax } from '@/components/motion/Parallax';
import { Reveal } from '@/components/motion/Reveal';
import { StickyStack } from '@/components/motion/StickyStack';
import { Tilt } from '@/components/motion/Tilt';
import { ToneSection, type Tone } from '@/components/motion/ToneSection';
import { WordFill } from '@/components/motion/WordFill';
import { Sticker, type StickerKind } from '@/components/ui/Sticker';

function Band({ tone, id, title, children }: { tone: Tone; id: string; title: string; children: ReactNode }) {
  return (
    <ToneSection tone={tone} aria-labelledby={id} className="flex flex-col gap-6 py-16">
      <h3 id={id} className="text-2xl font-bold">
        {title}
      </h3>
      {children}
    </ToneSection>
  );
}

/** A rotated pill sticker that wobbles like a spring on hover (motion.css, `[data-pill-sticker]`). */
function PillSticker({ children, className }: { children: ReactNode; className: string }) {
  return (
    <span
      data-pill-sticker=""
      className={`border-ink font-display rounded-pill inline-flex min-h-11 items-center border px-5 text-[15px] leading-none font-black whitespace-nowrap text-black uppercase [filter:drop-shadow(0_0_0.6px_var(--sticker-edge))] ${className}`}
    >
      {children}
    </span>
  );
}

const STEP_TONES = ['bg-sticker-blue', 'bg-sticker-mint', 'bg-sticker-sun'] as const;

const BENTO: {
  stat: number;
  key: 'statItems' | 'statNeighbours' | 'statDays';
  sticker: StickerKind;
  tone: string;
  wide?: boolean;
}[] = [
  { stat: 1250, key: 'statItems', sticker: 'bolt', tone: 'bg-surface', wide: true },
  { stat: 386, key: 'statNeighbours', sticker: 'check', tone: 'bg-sticker-lavender text-black' },
  { stat: 4210, key: 'statDays', sticker: 'coin', tone: 'bg-sticker-sun text-black' },
];

/**
 * Every motion technique of components/motion in one scroll, for checking by eye in both themes and
 * all three languages. Each band morphs the page background as it arrives.
 */
export function MotionDemos() {
  const t = useTranslations('styleguide.motion');
  const words = Array.from({ length: 10 }, (_, i) => t(`word${i + 1}` as 'word1'));

  return (
    <section aria-labelledby="motion-title" className="flex flex-col">
      <h2 id="motion-title" className="border-ink border-b pb-2 text-[30px] leading-tight font-bold">
        {t('title')}
      </h2>
      <p className="mt-5 max-w-[60ch] text-lg leading-relaxed">{t('intro')}</p>

      <Band tone="mint" id="motion-words" title={t('statementTitle')}>
        <WordFill
          text={t('statement')}
          className="max-w-[22ch] text-[clamp(1.75rem,6vw,3.5rem)] leading-[1.08] font-bold text-balance [overflow-wrap:break-word]"
        />
      </Band>

      <Band tone="lavender" id="motion-steps" title={t('stepsTitle')}>
        <StickyStack label={t('stepsTitle')} className="max-w-xl">
          {([1, 2, 3] as const).map((step, index) => (
            <div
              key={step}
              className={`border-ink rounded-card-xl flex min-h-56 flex-col gap-3 border p-6 text-black sm:p-8 ${STEP_TONES[index]}`}
            >
              <span className="font-display text-5xl leading-none font-black">{step}</span>
              <p className="text-2xl leading-tight font-bold">{t(`step${step}Title`)}</p>
              <p className="text-base leading-relaxed">{t(`step${step}Body`)}</p>
            </div>
          ))}
        </StickyStack>
      </Band>

      <Band tone="sun" id="motion-stickers" title={t('stickersTitle')}>
        <div className="relative -mx-4 h-80 overflow-x-clip sm:-mx-8">
          <Parallax speed={-0.35} className="absolute top-6 -left-10">
            <span
              aria-hidden="true"
              className="border-ink bg-sticker-blue block size-40 rounded-full border"
            />
          </Parallax>
          <Parallax speed={-0.2} className="absolute right-[-3rem] bottom-0">
            <span
              aria-hidden="true"
              className="border-ink bg-sticker-mint block h-32 w-56 rounded-[3rem] border"
            />
          </Parallax>
          <Parallax speed={0.5} className="absolute top-10 left-[12%]">
            <PillSticker className="bg-sticker-lavender -rotate-6">{t('pill1')}</PillSticker>
          </Parallax>
          <Parallax speed={0.25} className="absolute top-36 right-[8%]">
            <PillSticker className="bg-sticker-ember rotate-3">{t('pill2')}</PillSticker>
          </Parallax>
          <Parallax speed={0.7} className="absolute bottom-6 left-[30%]">
            <PillSticker className="bg-sticker-mint rotate-[8deg]">{t('pill3')}</PillSticker>
          </Parallax>
          <Bob delay={600} className="absolute top-2 right-[38%]">
            <Sticker kind="star" size={56} />
          </Bob>
        </div>
      </Band>

      <Band tone="blue" id="motion-marquee" title={t('marqueeTitle')}>
        <div className="-mx-4 sm:-mx-8">
          <Marquee rows={[words.slice(0, 5), words.slice(5)]} className="pt-6" />
        </div>
      </Band>

      <Band tone="canvas" id="motion-bento" title={t('bentoTitle')}>
        <p className="max-w-[60ch] text-base leading-relaxed">{t('bentoHint')}</p>
        <ul className="grid gap-4 sm:grid-cols-2">
          {BENTO.map(({ stat, key, sticker, tone, wide }, index) => (
            <li key={key} className={wide ? 'sm:col-span-2' : undefined}>
              <Reveal index={index} className="h-full">
                <Tilt className={`flex h-full flex-col gap-4 p-6 ${tone}`}>
                  <span data-bounce="" className="inline-block self-start">
                    <Sticker kind={sticker} size={48} />
                  </span>
                  <span className="font-display text-[clamp(2.5rem,9vw,4rem)] leading-none font-black">
                    <CountUp value={stat} />
                  </span>
                  <span className="text-lg font-bold">{t(key)}</span>
                </Tilt>
              </Reveal>
            </li>
          ))}
        </ul>
        <p className="text-sm">{t('sampleNote')}</p>
      </Band>
    </section>
  );
}

import type { ReactNode } from 'react';
import { Ribbon } from '@/components/decor/Ribbon';
import { StickerCluster, type PlacedSticker } from '@/components/decor/StickerCluster';
import { LetterRise } from '@/components/motion/LetterRise';
import { displayFit } from '@/lib/display-fit';

type PageBannerProps = {
  title: string;
  lead?: ReactNode;
  stickers?: PlacedSticker[];
  /** The ribbon belongs to loud banners only; documents (terms, privacy) stay calm. */
  ribbon?: boolean;
  children?: ReactNode;
};

/** The banner at the top of a service page: the display title, a lead, stickers and maybe the ribbon. */
export function PageBanner({ title, lead, stickers = [], ribbon = false, children }: PageBannerProps) {
  return (
    <header className="bg-canvas border-ink relative overflow-x-clip border-b">
      {ribbon && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0">
          <Ribbon variant="wave" />
        </div>
      )}
      <div
        className={`relative mx-auto flex max-w-[1440px] flex-col gap-6 px-4 pt-14 sm:px-8 sm:pt-20 ${ribbon ? 'pb-28 sm:pb-40' : 'pb-14 sm:pb-20'}`}
      >
        <div className="@container relative">
          <h1
            style={displayFit(title, { min: '2.5rem', max: '9rem' })}
            className="font-display text-display-fit relative z-10 max-w-[14ch] leading-[0.82] font-black text-balance uppercase"
          >
            <LetterRise text={title} stagger={18} />
          </h1>
          {stickers.length > 0 && <StickerCluster items={stickers} />}
        </div>
        {lead && <p className="relative z-10 max-w-[56ch] text-lg leading-relaxed sm:text-xl">{lead}</p>}
        {children}
      </div>
    </header>
  );
}

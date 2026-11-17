import type { ReactNode } from 'react';
import type { PlacedSticker } from '@/components/decor/StickerCluster';
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

/** The banner at the top of a service page: the display title, a lead and maybe the ribbon. */
// `stickers` and `ribbon` are still accepted from callers; v16 draws neither (the inflatable ribbon
// and the stickers belonged to the retired sticker book).
export function PageBanner({ title, lead, children }: PageBannerProps) {
  return (
    <header className="bg-canvas border-ink/15 relative overflow-x-clip border-b">
      <div
        className={`page relative flex flex-col gap-6 pt-14 sm:pt-20 pb-14 sm:pb-20`}
      >
        <div className="@container relative">
          <h1
            style={displayFit(title, { min: '2.5rem', max: '9rem' })}
            className="font-display text-display-fit relative z-10 max-w-[14ch] leading-[0.82] font-black text-balance uppercase"
          >
            <LetterRise text={title} stagger={18} />
          </h1>
        </div>
        {lead && <p className="relative z-10 max-w-lead text-lg leading-relaxed sm:text-xl">{lead}</p>}
        {children}
      </div>
    </header>
  );
}
